#!/bin/bash

# =============================================================================
# Script de restauration de backup PostgreSQL pour Fonds Prévention Argile
# =============================================================================
# Charge un dump PostgreSQL dans la base LOCALE (conteneur Docker du projet).
# La base locale est détruite et recréée : ce script n'a rien à faire ailleurs.
#
# Usage: pnpm db:restore [-d <directory>] [-k] [-y] [backup_file.tar.gz]
#
# Sans nom de fichier, propose les dumps du dossier, du plus récent au plus ancien.
#
# Options:
#   -d <directory>  Répertoire des dumps (défaut : DB_BACKUP_DIR de l'environnement ou de
#                   .env.local, sinon ~/fonds-prevention-argile-backups)
#   -k              Garder les fichiers temporaires après restauration
#   -y              Ne pas demander de confirmation avant d'écraser la base
#   -h              Afficher l'aide
#
# Exemple:
#   pnpm db:restore
#   pnpm db:restore mon-dump.tar.gz
#   pnpm db:restore -d ~/dumps -k mon-dump.tar.gz
#
# Un dump issu d'un environnement réel contient des données personnelles : le supprimer
# une fois le diagnostic terminé, et neutraliser les intégrations sortantes avant de
# lancer l'app dessus (cf. docs/ops/db-local.md).
# =============================================================================

set -e

# Configuration (surchargeable par l'environnement, comme dans docker-compose.yml)
CONTAINER_NAME="${DB_CONTAINER:-fonds-argile-postgres}"
DB_USER="${DB_USER:-fonds_argile_user}"
DB_NAME="${DB_NAME:-fonds_argile}"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# Lit une variable de .env.local sans le sourcer : le fichier est écrit pour Next, pas pour bash.
lire_env_local() {
    local fichier="$REPO_ROOT/.env.local"
    [ -f "$fichier" ] || return 0
    grep -E "^$1=" "$fichier" | tail -n 1 | cut -d= -f2- | sed -e "s/^[\"']//" -e "s/[\"']\$//"
}

# Hors du dépôt : le dump, et sa version décompressée, contiennent des données personnelles.
DEFAULT_BACKUP_DIR="${DB_BACKUP_DIR:-${BACKUP_DIR:-$(lire_env_local DB_BACKUP_DIR)}}"
DEFAULT_BACKUP_DIR="${DEFAULT_BACKUP_DIR:-$HOME/fonds-prevention-argile-backups}"
DEFAULT_BACKUP_DIR="${DEFAULT_BACKUP_DIR/#\~/$HOME}"

# Variables
BACKUP_DIR="$DEFAULT_BACKUP_DIR"
KEEP_FILES=false
CONFIRMER=true
BACKUP_FILE=""
# Dossier d'extraction jetable : un ancien .pgsql du dossier des dumps ne peut plus être pris
# pour celui de l'archive choisie, ni supprimé à sa place.
TMP_DIR=""
CONTAINER_DUMP=""

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonctions d'affichage
print_step() {
    echo -e "\n${BLUE}[ÉTAPE]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERREUR]${NC} $1" >&2
}

print_warning() {
    echo -e "${YELLOW}[ATTENTION]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Fonction d'aide. Argument optionnel : le code de sortie (0 pour -h, 1 sur erreur
# d'usage, pour qu'un appelant scripté puisse distinguer les deux).
show_help() {
    echo "Usage: pnpm db:restore [-d <directory>] [-k] [-y] [backup_file.tar.gz]"
    echo ""
    echo "Charge un dump PostgreSQL dans la base LOCALE '$DB_NAME' (conteneur Docker)."
    echo "La base locale est détruite et recréée. Sans nom de fichier, propose les dumps du dossier."
    echo ""
    echo "Options:"
    echo "  -d <directory>  Répertoire des dumps (défaut: $DEFAULT_BACKUP_DIR)"
    echo "  -k              Garder les fichiers temporaires après restauration"
    echo "  -y              Ne pas demander de confirmation avant d'écraser la base"
    echo "  -h              Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  pnpm db:restore"
    echo "  pnpm db:restore mon-dump.tar.gz"
    echo "  pnpm db:restore -d ~/dumps -k mon-dump.tar.gz"
    exit "${1:-0}"
}

# Liste les dumps du plus récent au plus ancien ; fzf s'il est installé, sinon un menu numéroté.
choisir_dump() {
    local dumps=() f i choix
    while IFS= read -r f; do dumps+=("$f"); done < <(cd "$BACKUP_DIR" && ls -t -- *.tar.gz 2>/dev/null)

    if [ ${#dumps[@]} -eq 0 ]; then
        print_error "Aucun dump .tar.gz dans $BACKUP_DIR"
        exit 1
    fi

    if command -v fzf > /dev/null; then
        BACKUP_FILE=$(printf '%s\n' "${dumps[@]}" | fzf --prompt="Dump à restaurer > " --height=40% --reverse) \
            || { print_info "Abandon, rien n'a été modifié"; exit 0; }
        return
    fi

    echo "Dumps dans $BACKUP_DIR (du plus récent au plus ancien) :"
    for i in "${!dumps[@]}"; do
        printf "  %2d) %-45s %s  %s\n" $((i + 1)) "${dumps[$i]}" \
            "$(date -r "$BACKUP_DIR/${dumps[$i]}" '+%d/%m %H:%M')" \
            "$(du -h "$BACKUP_DIR/${dumps[$i]}" | cut -f1)"
    done
    read -r -p "Numéro [1] : " choix || { echo; exit 1; }
    choix="${choix:-1}"
    if ! [[ "$choix" =~ ^[0-9]+$ ]] || [ "$choix" -lt 1 ] || [ "$choix" -gt ${#dumps[@]} ]; then
        print_error "Choix invalide : $choix"
        exit 1
    fi
    BACKUP_FILE="${dumps[$((choix - 1))]}"
}

# Appelé à toute sortie, erreur et abandon compris : sinon un dump extrait, donc une copie en
# clair de la base, restait sur le disque après un échec.
cleanup() {
    if [ "$KEEP_FILES" = true ]; then
        if [ -n "$TMP_DIR" ]; then print_warning "Option -k : dump extrait conservé dans $TMP_DIR"; fi
        if [ -n "$CONTAINER_DUMP" ]; then print_warning "Option -k : dump conservé dans le conteneur ($CONTAINER_DUMP)"; fi
        return 0
    fi
    # Chaque suppression est tentée indépendamment : sous set -e, un premier échec (dossier
    # de l'archive en lecture seule) laissait aussi la copie du conteneur.
    if [ -n "$TMP_DIR" ] && [ -d "$TMP_DIR" ]; then
        chmod -R u+rwx "$TMP_DIR" 2> /dev/null || true
        rm -rf "$TMP_DIR" 2> /dev/null || print_warning "Dump extrait non supprimé, à effacer à la main : $TMP_DIR"
    fi
    if [ -n "$CONTAINER_DUMP" ]; then
        docker exec "$CONTAINER_NAME" rm -f "/$CONTAINER_DUMP" > /dev/null 2>&1 \
            || print_warning "Copie non supprimée dans le conteneur : $CONTAINER_DUMP"
    fi
    return 0
}

# Gestion des erreurs
handle_error() {
    print_error "Une erreur est survenue à la ligne $1"
    print_error "La restauration a échoué"
    exit 1
}

trap 'handle_error $LINENO' ERR
trap cleanup EXIT

# Parsing des arguments
while getopts "d:kyh" opt; do
    case $opt in
        d)
            BACKUP_DIR="$OPTARG"
            ;;
        k)
            KEEP_FILES=true
            ;;
        y)
            CONFIRMER=false
            ;;
        h)
            show_help
            ;;
        \?)
            print_error "Option invalide: -$OPTARG"
            show_help 1
            ;;
    esac
done

shift $((OPTIND-1))

BACKUP_FILE="${1:-}"

# =============================================================================
# DÉBUT DU SCRIPT
# =============================================================================

echo ""
echo "=============================================="
echo "  Restauration de backup PostgreSQL"
echo "  Fonds Prévention Argile"
echo "=============================================="
echo ""

# Vérifier que le répertoire existe
if [ ! -d "$BACKUP_DIR" ]; then
    print_error "Le répertoire n'existe pas : $BACKUP_DIR"
    print_info "Indiquez-le avec -d, ou DB_BACKUP_DIR dans .env.local"
    exit 1
fi

# Résoudre en absolu : le script fait un `cd` plus bas, après quoi un chemin relatif
# serait réinterprété depuis le nouveau répertoire courant.
BACKUP_DIR=$(cd "$BACKUP_DIR" && pwd)

[ -n "$BACKUP_FILE" ] || choisir_dump

print_info "Fichier backup : $BACKUP_FILE"
print_info "Répertoire : $BACKUP_DIR"
print_info "Conserver les fichiers temporaires : $KEEP_FILES"

# Vérifier que le fichier tar.gz existe
TAR_FILE_PATH="$BACKUP_DIR/$BACKUP_FILE"
if [ ! -f "$TAR_FILE_PATH" ]; then
    print_error "Le fichier backup n'existe pas : $TAR_FILE_PATH"
    exit 1
fi

print_success "Fichier backup trouvé"

# Vérifier que Docker est disponible
if ! command -v docker &> /dev/null; then
    print_error "Docker n'est pas installé ou pas dans le PATH"
    exit 1
fi

# Vérifier que le container est en cours d'exécution
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    print_error "Le container '$CONTAINER_NAME' n'est pas en cours d'exécution"
    print_info "Lancez 'docker-compose up -d' ou 'docker start $CONTAINER_NAME'"
    exit 1
fi

print_success "Container Docker '$CONTAINER_NAME' actif"

# -----------------------------------------------------------------------------
# ÉTAPE 1 : Extraction, dans un dossier dédié à côté des dumps (donc hors du dépôt)
# -----------------------------------------------------------------------------
print_step "Extraction de l'archive..."

TMP_DIR=$(mktemp -d "$BACKUP_DIR/.restauration.XXXXXX")
tar -xzf "$TAR_FILE_PATH" -C "$TMP_DIR"

DUMPS_EXTRAITS=()
while IFS= read -r f; do DUMPS_EXTRAITS+=("$f"); done < <(find "$TMP_DIR" -type f -name '*.pgsql')
if [ ${#DUMPS_EXTRAITS[@]} -ne 1 ]; then
    print_error "L'archive doit contenir exactement un fichier .pgsql (trouvés : ${#DUMPS_EXTRAITS[@]})"
    exit 1
fi
PGSQL_PATH="${DUMPS_EXTRAITS[0]}"

print_success "Dump extrait : $(basename "$PGSQL_PATH") ($(du -h "$PGSQL_PATH" | cut -f1))"

# -----------------------------------------------------------------------------
# ÉTAPE 2 : Copie et contrôle dans le conteneur, avant toute suppression
# -----------------------------------------------------------------------------
print_step "Contrôle du dump dans le conteneur Docker..."

CONTAINER_DUMP="/tmp/restauration-$$.pgsql"
docker cp "$PGSQL_PATH" "$CONTAINER_NAME:$CONTAINER_DUMP" > /dev/null

# Le slash de tête double le chemin, ce qui évite sa réécriture par Git Bash sous Windows.
# Lecture complète vers /dev/null : --list ne lit que la table des matières, et laissait passer
# un dump tronqué qui n'échouait qu'après la suppression de la base.
if ! docker exec "$CONTAINER_NAME" pg_restore --file=/dev/null "/$CONTAINER_DUMP" > /dev/null 2>&1; then
    print_error "Ce dump est illisible ou incomplet : la base n'a pas été touchée"
    exit 1
fi

print_success "Dump lu en entier"

# Dernier point de retour : tout ce qui suit supprime la base locale.
if [ "$CONFIRMER" = true ]; then
    echo ""
    print_warning "La base locale '$DB_NAME' va être supprimée puis remplacée par $BACKUP_FILE."
    read -r -p "Continuer ? [o/N] " reponse || { echo; exit 1; }
    case "$reponse" in
        o|O|oui|OUI) ;;
        *) print_info "Abandon, rien n'a été modifié"; exit 0 ;;
    esac
fi

# -----------------------------------------------------------------------------
# ÉTAPES 3 à 6 : Recréation de la base, puis restauration
# -----------------------------------------------------------------------------
print_step "Recréation de la base '$DB_NAME'..."

# --force déconnecte les clients (PostgreSQL 13+) ; dropdb et createdb échappent le nom eux-mêmes.
docker exec "$CONTAINER_NAME" dropdb -U "$DB_USER" --if-exists --force "$DB_NAME"
docker exec "$CONTAINER_NAME" createdb -U "$DB_USER" "$DB_NAME"

print_success "Base recréée vide"

print_step "Restauration du dump (cela peut prendre quelques minutes)..."

docker exec "$CONTAINER_NAME" pg_restore -U "$DB_USER" -d "$DB_NAME" \
    --no-owner --no-privileges "/$CONTAINER_DUMP"

print_success "Dump restauré"

# -----------------------------------------------------------------------------
# ÉTAPE 7 : Vérification des données
# -----------------------------------------------------------------------------
print_step "Vérification des données..."

USERS_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM users;" | tr -d ' ')

print_success "Nombre d'utilisateurs dans la base : $USERS_COUNT"

# Afficher quelques stats supplémentaires si disponibles
TABLES_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

print_info "Nombre de tables : $TABLES_COUNT"

# =============================================================================
# FIN DU SCRIPT
# =============================================================================

echo ""
echo "=============================================="
echo -e "  ${GREEN}Restauration terminée avec succès${NC}"
echo "=============================================="
echo ""
print_info "Base '$DB_NAME' restaurée depuis '$BACKUP_FILE'"
print_info "Vous pouvez maintenant utiliser votre application"
echo ""
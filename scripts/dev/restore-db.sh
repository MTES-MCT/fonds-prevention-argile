#!/bin/bash

# =============================================================================
# Script de restauration de backup PostgreSQL pour Fonds Prévention Argile
# =============================================================================
# Charge un dump PostgreSQL dans la base LOCALE (conteneur Docker du projet).
# La base locale est détruite et recréée : ce script n'a rien à faire ailleurs.
#
# Usage: ./scripts/dev/restore-db.sh [-d <directory>] [-k] <backup_file.tar.gz>
#
# Options:
#   -d <directory>  Répertoire contenant les dumps (défaut: $BACKUP_DIR, sinon ~/fonds-prevention-argile-backups)
#   -k              Garder les fichiers temporaires après restauration
#   -h              Afficher l'aide
#
# Exemple:
#   ./scripts/dev/restore-db.sh mon-dump.tar.gz
#   ./scripts/dev/restore-db.sh -d ~/dumps -k mon-dump.tar.gz
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
# Hors du dépôt : le dump, et sa version décompressée, contiennent des données personnelles.
DEFAULT_BACKUP_DIR="${BACKUP_DIR:-$HOME/fonds-prevention-argile-backups}"

# Variables
BACKUP_DIR="$DEFAULT_BACKUP_DIR"
KEEP_FILES=false
BACKUP_FILE=""
PGSQL_FILE=""
CONTAINER_BACKUP_PATH=""
CONTAINER_CP_PATH=""

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
    echo "Usage: $0 [-d <directory>] [-k] <backup_file.tar.gz>"
    echo ""
    echo "Charge un dump PostgreSQL dans la base LOCALE '$DB_NAME' (conteneur Docker)."
    echo "La base locale est détruite et recréée."
    echo ""
    echo "Options:"
    echo "  -d <directory>  Répertoire contenant les dumps (défaut: $DEFAULT_BACKUP_DIR)"
    echo "  -k              Garder les fichiers temporaires après restauration"
    echo "  -h              Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0 mon-dump.tar.gz"
    echo "  $0 -d ~/dumps mon-dump.tar.gz"
    echo "  $0 -k mon-dump.tar.gz"
    exit "${1:-0}"
}

# Fonction de nettoyage
cleanup() {
    if [ "$KEEP_FILES" = true ]; then
        print_warning "Option -k activée : les fichiers temporaires sont conservés"
        if [ -n "$PGSQL_FILE" ] && [ -f "$BACKUP_DIR/$PGSQL_FILE" ]; then
            print_info "Fichier local conservé : $BACKUP_DIR/$PGSQL_FILE"
        fi
        if [ -n "$CONTAINER_CP_PATH" ]; then
            print_info "Fichier container conservé : $CONTAINER_CP_PATH"
        fi
    else
        print_step "Nettoyage des fichiers temporaires..."
        
        # Supprimer le fichier .pgsql local
        if [ -n "$PGSQL_FILE" ] && [ -f "$BACKUP_DIR/$PGSQL_FILE" ]; then
            rm -f "$BACKUP_DIR/$PGSQL_FILE"
            print_success "Fichier local supprimé : $PGSQL_FILE"
        fi
        
        # Supprimer le fichier dans le container
        if [ -n "$CONTAINER_CP_PATH" ]; then
            docker exec "$CONTAINER_NAME" rm -f "$CONTAINER_BACKUP_PATH" 2>/dev/null || true
            print_success "Fichier container supprimé : $CONTAINER_CP_PATH"
        fi
    fi
}

# Gestion des erreurs
handle_error() {
    print_error "Une erreur est survenue à la ligne $1"
    print_error "La restauration a échoué"
    exit 1
}

trap 'handle_error $LINENO' ERR

# Parsing des arguments
while getopts "d:kh" opt; do
    case $opt in
        d)
            BACKUP_DIR="$OPTARG"
            ;;
        k)
            KEEP_FILES=true
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

# Vérifier le paramètre obligatoire
if [ -z "$1" ]; then
    print_error "Le nom du fichier backup est obligatoire"
    echo ""
    show_help 1
fi

BACKUP_FILE="$1"

# =============================================================================
# DÉBUT DU SCRIPT
# =============================================================================

echo ""
echo "=============================================="
echo "  Restauration de backup PostgreSQL"
echo "  Fonds Prévention Argile"
echo "=============================================="
echo ""

print_info "Fichier backup : $BACKUP_FILE"
print_info "Répertoire : $BACKUP_DIR"
print_info "Conserver les fichiers temporaires : $KEEP_FILES"

# Vérifier que le répertoire existe
if [ ! -d "$BACKUP_DIR" ]; then
    print_error "Le répertoire n'existe pas : $BACKUP_DIR"
    exit 1
fi

# Résoudre en absolu : le script fait un `cd` plus bas, après quoi un chemin relatif
# serait réinterprété depuis le nouveau répertoire courant.
BACKUP_DIR=$(cd "$BACKUP_DIR" && pwd)

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
# ÉTAPE 1 : Extraction du fichier tar.gz
# -----------------------------------------------------------------------------
print_step "Extraction du fichier tar.gz..."

cd "$BACKUP_DIR"
tar -xzf "$BACKUP_FILE"

# Trouver le fichier .pgsql extrait (le plus récent)
PGSQL_FILE=$(ls -t *.pgsql 2>/dev/null | head -n 1)

if [ -z "$PGSQL_FILE" ]; then
    print_error "Aucun fichier .pgsql trouvé après extraction"
    exit 1
fi

print_success "Fichier extrait : $PGSQL_FILE"
print_info "Taille : $(ls -lh "$PGSQL_FILE" | awk '{print $5}')"

# -----------------------------------------------------------------------------
# ÉTAPE 2 : Copie du fichier dans le container
# -----------------------------------------------------------------------------
print_step "Copie du fichier dans le container Docker..."

# Chemin dans le container (double slash pour docker exec sous Git Bash)
CONTAINER_BACKUP_PATH="//tmp/backup-$PGSQL_FILE"
# Chemin pour docker cp (sans double slash)
CONTAINER_CP_PATH="/tmp/backup-$PGSQL_FILE"

docker cp "$BACKUP_DIR/$PGSQL_FILE" "$CONTAINER_NAME:$CONTAINER_CP_PATH"

# Vérifier que le fichier est dans le container
docker exec "$CONTAINER_NAME" ls -lh "$CONTAINER_BACKUP_PATH" > /dev/null

print_success "Fichier copié dans le container : $CONTAINER_BACKUP_PATH"

# -----------------------------------------------------------------------------
# ÉTAPE 3 : Déconnexion des clients actifs
# -----------------------------------------------------------------------------
print_step "Déconnexion des clients actifs de la base '$DB_NAME'..."

DISCONNECTED=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -t -c \
    "SELECT COUNT(*) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();")

docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
    > /dev/null 2>&1 || true

print_success "Clients déconnectés (${DISCONNECTED// /} connexion(s) fermée(s))"

# -----------------------------------------------------------------------------
# ÉTAPE 4 : Suppression de la base existante
# -----------------------------------------------------------------------------
print_step "Suppression de la base de données '$DB_NAME'..."

docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c \
    "DROP DATABASE IF EXISTS $DB_NAME;" > /dev/null

print_success "Base de données supprimée"

# -----------------------------------------------------------------------------
# ÉTAPE 5 : Création d'une nouvelle base
# -----------------------------------------------------------------------------
print_step "Création d'une nouvelle base de données '$DB_NAME'..."

docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c \
    "CREATE DATABASE $DB_NAME;" > /dev/null

print_success "Base de données créée"

# -----------------------------------------------------------------------------
# ÉTAPE 6 : Restauration du backup
# -----------------------------------------------------------------------------
print_step "Restauration du backup (cela peut prendre quelques minutes)..."

docker exec "$CONTAINER_NAME" pg_restore -U "$DB_USER" -d "$DB_NAME" \
    --no-owner --no-privileges "$CONTAINER_BACKUP_PATH"

print_success "Backup restauré avec succès"

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

# -----------------------------------------------------------------------------
# ÉTAPE 8 : Nettoyage
# -----------------------------------------------------------------------------
cleanup

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
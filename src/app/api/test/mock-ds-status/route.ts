import { DSStatus } from "@/lib/parcours/parcours.types";
import { NextRequest, NextResponse } from "next/server";

// Stockage en mémoire de l'état mocké actuel
let globalMockStatus = DSStatus.EN_CONSTRUCTION;

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Dev only" }, { status: 403 });
  }

  const { status } = await request.json();
  globalMockStatus = status;
  return NextResponse.json({ success: true });
}

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Dev only" }, { status: 403 });
  }
  return NextResponse.json({ status: globalMockStatus });
}

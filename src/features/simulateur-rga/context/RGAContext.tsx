"use client";

import { createContext } from "react";
import { RGAContextType } from "./RGAContext.types";

/**
 * Contexte RGA
 */
export const RGAContext = createContext<RGAContextType | null>(null);

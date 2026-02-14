import * as Icons from "../icons";
import { SVGProps, ComponentType } from "react";

export interface NavSubItem {
  title: string;
  url: string;
}

export interface NavItem {
  title: string;
  url?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  items: NavSubItem[];
  restricted?: boolean; // New property to mark items for specific users
}

export interface NavSection {
  label: string;
  items: NavItem[];
  restricted?: boolean;
}

export const NAV_DATA: NavSection[] = [
  {
    label: "Main Menu",
    items: [
      {
        title: "Dashboard",
        url: "/",
        icon: Icons.HomeIcon,
        items: [],
      },
      {
        title: "Clear Port",
        url: "/clearport",
        icon: Icons.Alphabet,
        items: [],
      },
      {
        title: "Reports",
        url: "/reports",
        icon: Icons.Table,
        items: [],
      },
    ],
  },
  {
    label: "Restricted Tools",
    restricted: true, // Mark whole section as restricted
    items: [
      {
        title: "CV Converter",
        url: "/cv-converter",
        icon: Icons.Alphabet,
        items: [],
      },
      {
        title: "PDF Converter",
        url: "/pdf-converter",
        icon: Icons.Calendar,
        items: [],
      },
    ],
  },
  {
    label: "ADMIN",
    items: [
      {
        title: "Users",
        url: "/users",
        icon: Icons.User,
        items: [],
      },
    ],
  },
];
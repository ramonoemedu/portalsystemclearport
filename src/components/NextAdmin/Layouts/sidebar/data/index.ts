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
}

export interface NavSection {
  label: string;
  items: NavItem[];
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

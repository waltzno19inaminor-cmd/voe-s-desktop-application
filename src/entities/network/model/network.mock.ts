import type { Network } from "./network.type";

export const networks: Network[] = [
    {
        id: "1",
        name: "A.M.",
        isOnline: true,
        lastActive: "online",
    },
    {
        id: "2",
        name: "L.R.",
        isOnline: false,
        lastActive: "today",
    },
    {
        id: "3",
        name: "N.K.",
        isOnline: false,
        lastActive: "yesterday",
    },
    {
        id: "4",
        name: "E.S.",
        isOnline: false,
        lastActive: "yesterday",
    },
];
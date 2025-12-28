import type { SocketEventsMap } from "./api.types";

export type SocketEvent = keyof SocketEventsMap;
export type SocketEventHandler<T extends SocketEvent> = SocketEventsMap[T];

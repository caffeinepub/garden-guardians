import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface ScoreEntry {
    id: bigint;
    waveReached: bigint;
    score: bigint;
    timestamp: bigint;
    playerName: string;
}
export interface backendInterface {
    clearScores(): Promise<void>;
    getPlayerScores(playerName: string): Promise<Array<ScoreEntry>>;
    getTopScores(): Promise<Array<ScoreEntry>>;
    submitScore(playerName: string, score: bigint, waveReached: bigint): Promise<bigint>;
}

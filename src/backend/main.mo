import Text "mo:core/Text";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import List "mo:core/List";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";

actor {
  type ScoreEntry = {
    id : Nat;
    playerName : Text;
    score : Nat;
    waveReached : Nat;
    timestamp : Int;
  };

  module ScoreEntry {
    public func compareByScoreDescending(a : ScoreEntry, b : ScoreEntry) : Order.Order {
      Nat.compare(b.score, a.score);
    };
  };

  let scores = List.empty<ScoreEntry>();
  var nextId = 0;

  public shared ({ caller }) func submitScore(playerName : Text, score : Nat, waveReached : Nat) : async Nat {
    let entry : ScoreEntry = {
      id = nextId;
      playerName;
      score;
      waveReached;
      timestamp = Time.now();
    };

    scores.add(entry);
    nextId += 1;
    entry.id;
  };

  public query ({ caller }) func getTopScores() : async [ScoreEntry] {
    let allScores = scores.toArray();
    let sortedScores = allScores.sort(ScoreEntry.compareByScoreDescending);
    let topScores = Array.tabulate(
      Nat.min(10, sortedScores.size()),
      func(i) { sortedScores[i] },
    );
    topScores;
  };

  public query ({ caller }) func getPlayerScores(playerName : Text) : async [ScoreEntry] {
    let filtered = scores.filter(
      func(entry) { entry.playerName == playerName }
    );
    filtered.toArray();
  };

  public shared ({ caller }) func clearScores() : async () {
    scores.clear();
    nextId := 0;
  };
};

/**
 * Merged items for the scheme-wide + personal feed (chronological).
 * Underlying data is still governed by RLS; each user only receives rows they may read.
 */
export type FeedItem =
  | {
      kind: "announcement";
      id: string;
      at: string;
      title: string;
      body: string;
      tone: string;
      pinned: boolean;
    }
  | {
      kind: "comms";
      id: string;
      at: string;
      subject: string | null;
      status: string;
      to_party: string | null;
      stage: string;
      isOutbound: boolean;
    }
  | {
      kind: "records";
      id: string;
      at: string;
      status: string;
      request_type: string[];
    };

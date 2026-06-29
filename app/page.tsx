import { getPortfolioData } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { DEFAULT_BIO, type PortfolioData } from "@/lib/types";
import Portfolio from "@/components/Portfolio";

// Always render fresh — the portfolio is editable and reads from the DB.
export const dynamic = "force-dynamic";

export default async function Home() {
  let data: PortfolioData;
  try {
    data = await getPortfolioData();
  } catch (err) {
    // First run before the DB is configured: render an empty shell rather than crash.
    console.error("Failed to load portfolio data:", err);
    data = { bio: DEFAULT_BIO, web: [], wp: [], ui: [] };
  }

  let authed = false;
  try {
    authed = await isAuthed();
  } catch {
    authed = false;
  }

  return <Portfolio initialData={data} initialAuthed={authed} />;
}

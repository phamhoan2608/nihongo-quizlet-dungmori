import { getAllCards } from "@/lib/vocab";
import ReviewSession from "@/components/ReviewSession";

export default function ReviewPage() {
  const allCards = getAllCards();
  return <ReviewSession allCards={allCards} />;
}

import { Card, PageTitle } from "@/components/ui";
import { EventForm } from "../../_components/forms";

export default function NewEventPage() {
  return (
    <>
      <PageTitle kicker="Events">New event</PageTitle>
      <Card className="p-5 sm:p-6">
        <EventForm />
      </Card>
      <p className="mt-4 text-sm text-mute">Save the event first, then add ticket tiers on the next screen.</p>
    </>
  );
}

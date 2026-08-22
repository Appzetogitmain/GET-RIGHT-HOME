// Property-level subscriptions (Sale / Rental) for Owner and Broker accounts.
//
// Previously this page ran its own account-level purchase flow against
// `subscriptionService` — a single plan on the user, no property attachment,
// buying a second one silently overwrote the first. It now renders the
// shared property-level purchase flow, which is what §8/§2 of the
// subscription architecture spec requires: a subscription is a record of
// its own, attached to the specific listing(s) the subscriber chooses.
import PropertySubscriptionsPage from '../subscriptions/PropertySubscriptionsPage';

const UserSubscriptionsPage = () => <PropertySubscriptionsPage />;

export default UserSubscriptionsPage;

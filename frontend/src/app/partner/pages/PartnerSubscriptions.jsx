// Property-level subscriptions (Sale / Rental) for Builder (Partner) accounts.
//
// Previously this ran its own account-level purchase flow — one plan on the
// partner record, no property attachment, buying a second one overwrote the
// first, and the listing-type filter matched nothing because no plan carried
// a value for it. It now renders the shared property-level purchase flow
// (see subscriptions/PropertySubscriptionsPage) used by owners and brokers
// too, backed by `/api/property-subscriptions/*`.
import PropertySubscriptionsPage from '../../../pages/subscriptions/PropertySubscriptionsPage';

const PartnerSubscriptions = () => <PropertySubscriptionsPage />;

export default PartnerSubscriptions;

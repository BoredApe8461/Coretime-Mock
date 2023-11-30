// Copyright 2022 Parity Technologies (UK) Ltd.
// This file is part of Cumulus.

// Cumulus is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Cumulus is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Cumulus.  If not, see <http://www.gnu.org/licenses/>.

use crate::*;
use codec::{Decode, Encode};
use frame_support::{
	parameter_types,
	traits::{
		fungible::{Balanced, Credit},
		OnUnbalanced,
	},
};
use pallet_broker::{CoreAssignment, CoreIndex, CoretimeInterface, PartsOf57600};
use parachains_common::{impls::AccountIdOf, AccountId, Balance, BlockNumber};
use sp_std::marker::PhantomData;
use staging_xcm::latest::prelude::*;

pub struct CreditToStakingPot<R>(PhantomData<R>);
impl<R> OnUnbalanced<Credit<AccountIdOf<R>, Balances>> for CreditToStakingPot<R>
where
	R: pallet_balances::Config
		+ pallet_collator_selection::Config
		+ frame_system::Config<AccountId = sp_runtime::AccountId32>,
	AccountIdOf<R>:
		From<polkadot_core_primitives::AccountId> + Into<polkadot_core_primitives::AccountId>,
{
	fn on_nonzero_unbalanced(credit: Credit<AccountIdOf<R>, Balances>) {
		let staking_pot = <pallet_collator_selection::Pallet<R>>::account_id();
		let _ = <Balances as Balanced<_>>::resolve(&staking_pot, credit);
	}
}

/// A type containing the encoding of the Broker pallet in the Relay chain runtime. Used to
/// construct any remote calls. The codec index must correspond to the index of `Broker` in the
/// `construct_runtime` of the Relay chain.
#[derive(Encode, Decode)]
enum BrokerRuntimePallets<
	CoreIndex: Encode + Decode,
	BlockNumber: Encode + Decode,
	AccountId: Encode + Decode,
	Balance: Encode + Decode,
	CoreAssignment: Encode + Decode,
	PartsOf57600: Encode + Decode,
> {
	#[codec(index = 74)]
	Broker(
		CoretimeProviderCalls<
			CoreIndex,
			BlockNumber,
			AccountId,
			Balance,
			CoreAssignment,
			PartsOf57600,
		>,
	),
}

/// Call encoding for the calls needed from the Broker pallet.
#[derive(Encode, Decode)]
enum CoretimeProviderCalls<
	CoreIndex: Encode + Decode,
	BlockNumber: Encode + Decode,
	AccountId: Encode + Decode,
	Balance: Encode + Decode,
	CoreAssignment: Encode + Decode,
	PartsOf57600: Encode + Decode,
> {
	#[codec(index = 1)]
	RequestCoreCount(CoreIndex),
	#[codec(index = 2)]
	RequestRevenueInfoAt(BlockNumber),
	#[codec(index = 3)]
	CreditAccount(AccountId, Balance),
	#[codec(index = 4)]
	AssignCore(CoreIndex, BlockNumber, Vec<(CoreAssignment, PartsOf57600)>, Option<BlockNumber>),
}

parameter_types! {
	pub const BrokerPalletId: PalletId = PalletId(*b"py/broke");
}

parameter_types! {
	pub storage CoreCount: Option<CoreIndex> = None;
	pub storage CoretimeRevenue: Option<(BlockNumber, Balance)> = None;
}

/// Type that implements the `CoretimeInterface` for the allocation of Coretime. Meant to operate
/// from the parachain context. That is, the parachain provides a market (broker) for the sale of
/// coretime, but assumes a `CoretimeProvider` (i.e. a Relay Chain) to actually provide cores.
pub struct CoretimeAllocator;
impl CoretimeInterface for CoretimeAllocator {
	type AccountId = AccountId;
	type Balance = Balance;
	type BlockNumber = BlockNumber;

	fn latest() -> Self::BlockNumber {
		System::block_number()
	}

	fn request_core_count(count: CoreIndex) {
		use crate::coretime::CoretimeProviderCalls::RequestCoreCount;
		let request_core_count_call = BrokerRuntimePallets::<
			CoreIndex,
			BlockNumber,
			AccountId,
			Balance,
			CoreAssignment,
			PartsOf57600,
		>::Broker(RequestCoreCount(count));

		let message = Xcm(vec![
			Instruction::UnpaidExecution {
				weight_limit: WeightLimit::Unlimited,
				check_origin: None,
			},
			Instruction::Transact {
				origin_kind: OriginKind::Native,
				require_weight_at_most: Weight::from_parts(1, 1),
				call: request_core_count_call.encode().into(),
			},
		]);

		match PolkadotXcm::send_xcm(Here, MultiLocation::parent(), message.clone()) {
			Ok(_) => log::info!(
				target: "runtime::coretime",
				"Request to update schedulable cores sent successfully."
			),
			Err(e) => log::error!(
				target: "runtime::coretime",
				"Failed to send request to update schedulable cores: {:?}",
				e
			),
		}
	}

	fn request_revenue_info_at(when: Self::BlockNumber) {
		use crate::coretime::CoretimeProviderCalls::RequestRevenueInfoAt;
		let request_revenue_info_at_call = BrokerRuntimePallets::<
			CoreIndex,
			BlockNumber,
			AccountId,
			Balance,
			CoreAssignment,
			PartsOf57600,
		>::Broker(RequestRevenueInfoAt(when));

		let message = Xcm(vec![
			Instruction::UnpaidExecution {
				weight_limit: WeightLimit::Unlimited,
				check_origin: None,
			},
			Instruction::Transact {
				origin_kind: OriginKind::Native,
				require_weight_at_most: Weight::from_parts(1, 1),
				call: request_revenue_info_at_call.encode().into(),
			},
		]);

		match PolkadotXcm::send_xcm(Here, MultiLocation::parent(), message.clone()) {
			Ok(_) => log::info!(
				target: "runtime::coretime",
				"Request for revenue information sent successfully."
			),
			Err(e) => log::error!(
				target: "runtime::coretime",
				"Request for revenue information failed to send: {:?}",
				e
			),
		}
	}

	fn credit_account(who: Self::AccountId, amount: Self::Balance) {
		use crate::coretime::CoretimeProviderCalls::CreditAccount;
		let credit_account_call = BrokerRuntimePallets::<
			CoreIndex,
			BlockNumber,
			AccountId,
			Balance,
			CoreAssignment,
			PartsOf57600,
		>::Broker(CreditAccount(who, amount));

		let message = Xcm(vec![
			Instruction::UnpaidExecution {
				weight_limit: WeightLimit::Unlimited,
				check_origin: None,
			},
			Instruction::Transact {
				origin_kind: OriginKind::Native,
				require_weight_at_most: Weight::from_parts(1, 1),
				call: credit_account_call.encode().into(),
			},
		]);

		match PolkadotXcm::send_xcm(Here, MultiLocation::parent(), message.clone()) {
			Ok(_) => log::info!(
				target: "runtime::coretime",
				"Instruction to credit account sent successfully."
			),
			Err(e) => log::error!(
				target: "runtime::coretime",
				"Instruction to credit account failed to send: {:?}",
				e
			),
		}
	}

	fn assign_core(
		core: CoreIndex,
		begin: Self::BlockNumber,
		assignment: Vec<(CoreAssignment, PartsOf57600)>,
		end_hint: Option<Self::BlockNumber>,
	) {
		use crate::coretime::CoretimeProviderCalls::AssignCore;
		let assign_core_call = BrokerRuntimePallets::<
			CoreIndex,
			BlockNumber,
			AccountId,
			Balance,
			CoreAssignment,
			PartsOf57600,
		>::Broker(AssignCore(core, begin, assignment, end_hint));

		let message = Xcm(vec![
			Instruction::UnpaidExecution {
				weight_limit: WeightLimit::Unlimited,
				check_origin: None,
			},
			Instruction::Transact {
				origin_kind: OriginKind::Native,
				require_weight_at_most: Weight::from_parts(1, 1),
				call: assign_core_call.encode().into(),
			},
		]);

		match PolkadotXcm::send_xcm(Here, MultiLocation::parent(), message.clone()) {
			Ok(_) => log::info!(
				target: "runtime::coretime",
				"Core assignment sent successfully."
			),
			Err(e) => log::error!(
				target: "runtime::coretime",
				"Core assignment failed to send: {:?}",
				e
			),
		}
	}

	fn check_notify_core_count() -> Option<u16> {
		let count = CoreCount::get();
		CoreCount::set(&None);
		count
	}

	fn check_notify_revenue_info() -> Option<(Self::BlockNumber, Self::Balance)> {
		let revenue = CoretimeRevenue::get();
		CoretimeRevenue::set(&None);
		revenue
	}

	#[cfg(feature = "runtime-benchmarks")]
	fn ensure_notify_core_count(count: u16) {
		CoreCount::set(&Some(count));
	}

	#[cfg(feature = "runtime-benchmarks")]
	fn ensure_notify_revenue_info(when: Self::BlockNumber, revenue: Self::Balance) {
		CoretimeRevenue::set(&Some((when, revenue)));
	}
}

impl pallet_broker::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type Currency = Balances;
	type OnRevenue = CreditToStakingPot<Runtime>;
	type TimeslicePeriod = ConstU32<40>;
	type MaxLeasedCores = ConstU32<5>;
	type MaxReservedCores = ConstU32<5>;
	type Coretime = CoretimeAllocator;
	type ConvertBalance = sp_runtime::traits::Identity;
	type WeightInfo = ();
	type PalletId = BrokerPalletId;
	type AdminOrigin = EnsureRoot<AccountId>;
	type PriceAdapter = pallet_broker::Linear;
}

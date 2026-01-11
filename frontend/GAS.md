// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { SuiObjectRef } from '@mysten/sui/client';
import { getFaucetHost, requestSuiFromFaucetV1 } from '@mysten/sui/faucet';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

import { client } from './rpc';

// This simulates what a server would do to sponsor a transaction
export async function sponsorTransaction(sender: string, transactionKindBytes: Uint8Array) {
	// Rather than do gas pool management, we just spin out a new keypair to sponsor the transaction with:
	const keypair = new Ed25519Keypair();
	const address = keypair.getPublicKey().toSuiAddress();
	console.log(`Sponsor address: ${address}`);

	await requestSuiFromFaucetV1({ recipient: address, host: getFaucetHost('testnet') });

	let payment: SuiObjectRef[] = [];
	let retires = 50;
	while (retires !== 0) {
		const coins = await client.getCoins({ owner: address, limit: 1 });
		if (coins.data.length > 0) {
			payment = coins.data.map((coin) => ({
				objectId: coin.coinObjectId,
				version: coin.version,
				digest: coin.digest,
			}));
			break;
		}
		await new Promise((resolve) => setTimeout(resolve, 200)); // Sleep for 200ms
		retires -= 1;
	}

	const tx = Transaction.fromKind(transactionKindBytes);
	tx.setSender(sender);
	tx.setGasOwner(address);
	tx.setGasPayment(payment);

	return keypair.signTransaction(await tx.build({ client }));
}


// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
	ConnectButton,
	useCurrentAccount,
	useSignTransaction,
	useSuiClient,
} from '@mysten/dapp-kit';
import { SuiTransactionBlockResponse } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { ComponentProps, ReactNode, useMemo, useState } from 'react';

import { sponsorTransaction } from './utils/sponsorTransaction';

const Button = (props: ComponentProps<'button'>) => (
	<button
		className="bg-indigo-600 text-sm font-medium text-white rounded-lg px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60"
		{...props}
	/>
);

const CodePanel = ({
	title,
	json,
	action,
}: {
	title: string;
	json?: object | null;
	action: ReactNode;
}) => (
	<div>
		<div className="text-lg font-bold mb-2">{title}</div>
		<div className="mb-4">{action}</div>
		<code className="block bg-gray-200 p-2 text-gray-800 rounded text-sm break-all whitespace-pre-wrap">
			{JSON.stringify(json, null, 2)}
		</code>
	</div>
);

export function App() {
	const client = useSuiClient();
	const currentAccount = useCurrentAccount();
	const { mutateAsync: signTransaction } = useSignTransaction();
	const [loading, setLoading] = useState(false);
	const [sponsoredTx, setSponsoredTx] = useState<Awaited<
		ReturnType<typeof sponsorTransaction>
	> | null>(null);
	const [signedTx, setSignedTx] = useState<Awaited<ReturnType<typeof signTransaction>> | null>(
		null,
	);
	const [executedTx, setExecutedTx] = useState<SuiTransactionBlockResponse | null>(null);

	const tx = useMemo(() => {
		if (!currentAccount) return null;
		const tx = new Transaction();
		const [coin] = tx.splitCoins(tx.gas, [1]);
		tx.transferObjects([coin], currentAccount.address);
		return tx;
	}, [currentAccount]);

	return (
		<div className="p-8">
			<div className="grid grid-cols-4 gap-8">
				<CodePanel
					title="Transaction details"
					json={tx?.getData()}
					action={<ConnectButton className="!bg-indigo-600 !text-white" />}
				/>

				<CodePanel
					title="Sponsored Transaction"
					json={sponsoredTx}
					action={
						<Button
							disabled={!currentAccount || loading}
							onClick={async () => {
								setLoading(true);
								try {
									const bytes = await tx!.build({
										client,
										onlyTransactionKind: true,
									});
									const sponsoredBytes = await sponsorTransaction(currentAccount!.address, bytes);
									setSponsoredTx(sponsoredBytes);
								} finally {
									setLoading(false);
								}
							}}
						>
							Sponsor Transaction
						</Button>
					}
				/>

				<CodePanel
					title="Signed Transaction"
					json={signedTx}
					action={
						<Button
							disabled={!sponsoredTx || loading}
							onClick={async () => {
								setLoading(true);
								try {
									const signed = await signTransaction({
										transaction: Transaction.from(sponsoredTx!.bytes),
									});
									setSignedTx(signed);
								} finally {
									setLoading(false);
								}
							}}
						>
							Sign Transaction
						</Button>
					}
				/>
				<CodePanel
					title="Executed Transaction"
					json={executedTx}
					action={
						<Button
							disabled={!signedTx || loading}
							onClick={async () => {
								setLoading(true);
								try {
									const executed = await client.executeTransactionBlock({
										transactionBlock: signedTx!.bytes,
										signature: [signedTx!.signature, sponsoredTx!.signature],
										options: {
											showEffects: true,
											showEvents: true,
											showObjectChanges: true,
										},
									});
									setExecutedTx(executed);
								} finally {
									setLoading(false);
								}
							}}
						>
							Execute Transaction
						</Button>
					}
				/>
			</div>
		</div>
	);
}
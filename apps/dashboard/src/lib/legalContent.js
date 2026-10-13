// Plain-content model so the three legal documents share one renderer.
// NOTE: these are operator-drafted policies, not legal advice. The entity name,
// jurisdiction and contact address below must be confirmed by counsel before launch.

export const LEGAL_ENTITY   = 'RWA-ID Labs'
export const LEGAL_CONTACT  = 'partner@rwa-id.com'
export const LEGAL_UPDATED  = '31 July 2026'
export const LEGAL_JURISDICTION = 'the Republic of Panama'

export const LEGAL_DOCS = {
  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy',
    lede: 'What RWA-ID does and does not collect. The short version: there are no accounts, no tracking, and no server that stores your data.',
    sections: [
      {
        h: '1. Who we are',
        p: [
          `${LEGAL_ENTITY} builds and maintains the RWA-ID protocol and this console. The console is a static web application that talks directly to the Ethereum blockchain and to IPFS. It has no backend server, no database and no user accounts.`,
        ],
      },
      {
        h: '2. What we do not collect',
        p: [
          'We do not collect names, email addresses, passwords, IP-address logs, device identifiers or analytics of any kind through the console itself. We do not set cookies, and we do not run advertising or third-party tracking scripts.',
          'We never take custody of your funds, your private keys or your seed phrase. We cannot see them and cannot recover them.',
        ],
      },
      {
        h: '3. Information handled in your browser',
        p: [
          'When you connect a wallet, the console reads your public wallet address so it can show the projects you own. That address is public blockchain data. It is held in your browser session and is not transmitted to us.',
          'When you build an allowlist, the client names and wallet addresses you supply are processed entirely in your browser to compute a Merkle tree. The console stores a local pointer (the IPFS CID and entry count) in your browser’s localStorage so it can rebuild your claim link. Clearing site data removes it.',
        ],
      },
      {
        h: '4. Data you publish yourself',
        important: true,
        p: [
          'This is the most important section of this policy. When you publish an allowlist, the proof set — including every client name and wallet address in it — is uploaded to IPFS and is public and permanent. Anyone with the CID can read it, and pinned content cannot be reliably deleted once distributed.',
          'Likewise, every identity you issue, every fee you set and every revocation you perform is written to the Ethereum blockchain, which is public, permanent and outside anyone’s control, including ours.',
          'You are the data controller for the client information you choose to publish. Before uploading an allowlist, satisfy yourself that you have a lawful basis to publish those names and wallet addresses, and use pseudonymous labels rather than full legal names or other personal data wherever your obligations allow.',
        ],
      },
      {
        h: '5. Third parties the console talks to',
        list: [
          ['Ethereum RPC provider', 'Public node infrastructure used to read contract state and broadcast transactions. Your IP address is visible to that provider, as it is for any website you load.'],
          ['Pinata (IPFS pinning)', 'Receives the allowlist proof set you choose to publish, so it can be pinned and served over IPFS.'],
          ['IPFS gateways', 'Public gateways used to fetch proof sets when a client opens a claim link.'],
          ['WalletConnect / Reown', 'Handles the wallet connection handshake when you use a mobile or WalletConnect-compatible wallet.'],
          ['Google Fonts', 'Serves the typefaces used by this interface.'],
          ['Web3Forms', 'Receives your name, email, organisation and message only if you voluntarily submit the "Book a walkthrough" form.'],
        ],
        p: [
          'Each of these services operates under its own privacy policy. We do not control them and do not receive user data back from them.',
        ],
      },
      {
        h: '6. Your rights',
        p: [
          'Because we hold no personal data about you, there is generally nothing for us to access, correct, export or erase. If you submitted the contact form and would like that message deleted, email us and we will remove it.',
          'We cannot delete, amend or reverse anything written to the Ethereum blockchain or distributed over IPFS. Nobody can. Please take that into account before publishing.',
        ],
      },
      {
        h: '7. Children',
        p: ['The console is intended for institutional operators and is not directed at anyone under 18.'],
      },
      {
        h: '8. Changes and contact',
        p: [
          `We may update this policy as the protocol develops. The revision date at the top of this page always reflects the current version. Questions can go to ${LEGAL_CONTACT}.`,
        ],
      },
    ],
  },

  terms: {
    slug: 'terms',
    title: 'Terms & Conditions',
    lede: 'The terms on which you may use the RWA-ID console and protocol. Please read section 5 on irreversibility carefully.',
    sections: [
      {
        h: '1. Agreement',
        p: [
          `By connecting a wallet to this console or otherwise interacting with the RWA-ID smart contracts, you agree to these terms. If you do not agree, do not use the console. These terms are between you and ${LEGAL_ENTITY}.`,
        ],
      },
      {
        h: '2. What the service is',
        p: [
          'RWA-ID is a set of public smart contracts on Ethereum mainnet plus a static interface for interacting with them. The console is a convenience: the contracts are permissionless and can be used without it.',
          'We provide software. We do not provide custody, brokerage, exchange, payment processing, identity verification, KYC/AML screening or legal services, and nothing in the console constitutes financial, investment, tax or legal advice.',
        ],
      },
      {
        h: '3. Your responsibilities as an issuer',
        list: [
          ['Verification', 'You are solely responsible for verifying the identity of anyone you allowlist. RWA-ID performs no KYC, sanctions or eligibility screening on your behalf.'],
          ['Lawful basis', 'You are responsible for having the right to publish the client names and wallet addresses you upload, and for complying with data-protection, securities, AML and consumer law in your jurisdiction.'],
          ['Accuracy', 'You are responsible for the accuracy of every slug, address, fee and allowlist entry you submit. The console validates format, not intent.'],
          ['Key security', 'You are responsible for the security of the wallet that owns your namespace. Whoever controls that wallet controls the namespace.'],
        ],
      },
      {
        h: '4. Fees',
        p: [
          'Registering a namespace is free; you pay only network gas. Each identity claim charges a fee in USDC that you set, subject to a protocol minimum enforced by the contract. That fee is split at claim time: 70% to your nominated treasury address and 30% to the protocol.',
          'We do not hold, escrow or process your revenue at any point. Fees settle on-chain directly to the addresses recorded in the contract. If you nominate an address you do not control, the funds are not recoverable.',
        ],
      },
      {
        h: '5. Irreversibility',
        important: true,
        p: [
          'Blockchain transactions cannot be undone. Once confirmed, an action is final and neither you nor we can reverse it.',
          'In particular: a namespace slug is permanent and can never be renamed; a revocation permanently burns the identity token and blacklists that name under your project forever; a transfer of project ownership immediately and irreversibly hands every administrative right to the new address; and a treasury change routes all subsequent fees to the new address.',
          'The console asks you to confirm these actions deliberately for this reason. Review each state-change summary before you sign.',
        ],
      },
      {
        h: '6. Availability and risk',
        p: [
          'The console is provided on an "as is" and "as available" basis, without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose and non-infringement.',
          'Smart contracts may contain undiscovered vulnerabilities. Public RPC endpoints, IPFS gateways and pinning services may be slow or unavailable. Network congestion may delay or fail transactions. You accept these risks.',
        ],
      },
      {
        h: '7. Acceptable use',
        p: [
          'You must not use RWA-ID to facilitate unlawful activity, to issue identities to sanctioned persons or entities, to impersonate another organisation, or to circumvent applicable law. We may decline to support any deployment, though we cannot prevent use of the underlying contracts.',
        ],
      },
      {
        h: '8. Limitation of liability',
        p: [
          `To the fullest extent permitted by law, ${LEGAL_ENTITY} is not liable for any indirect, incidental, special, consequential or exemplary damages, or for any loss of profits, revenue, data, tokens or goodwill arising from your use of the console or the protocol. Our aggregate liability for any claim is limited to the protocol fees we actually received from you in the three months preceding the claim.`,
        ],
      },
      {
        h: '9. Changes, governing law and contact',
        p: [
          `We may amend these terms; continued use after a revision constitutes acceptance. These terms are governed by the laws of ${LEGAL_JURISDICTION}, without regard to conflict-of-law rules. Questions can go to ${LEGAL_CONTACT}.`,
        ],
      },
    ],
  },

  refunds: {
    slug: 'refunds',
    title: 'Refund Policy',
    lede: 'What can and cannot be refunded when fees settle directly on-chain.',
    sections: [
      {
        h: '1. The short version',
        important: true,
        p: [
          'On-chain payments are final and cannot be reversed. Claim fees settle instantly and directly to the issuer’s treasury and to the protocol at the moment a transaction confirms. There is no intermediary holding the money, so there is no mechanism by which we could return it.',
          'For that reason, claim fees and network gas are non-refundable.',
        ],
      },
      {
        h: '2. Why we cannot refund',
        list: [
          ['No custody', 'We never hold your funds. 70% of every claim fee goes to the issuer’s treasury address and 30% to the protocol, atomically, inside the same transaction.'],
          ['No reversal', 'Ethereum has no chargeback or reversal primitive. A confirmed transfer is permanent.'],
          ['Gas is consumed', 'Network fees are paid to validators, not to us, and are consumed even by a transaction that reverts.'],
        ],
      },
      {
        h: '3. Situations that are not refundable',
        list: [
          ['Change of mind', 'A claimed identity that you no longer want.'],
          ['Wrong name or slug', 'A name or namespace registered with a typo. Slugs are permanent; register a new namespace instead.'],
          ['Wrong treasury address', 'Fees routed to an address you do not control. Verify the address before signing.'],
          ['Revocation', 'An identity revoked by its issuer. The fee is not returned when a token is burned.'],
          ['Failed transaction', 'Gas spent on a transaction that reverted, including one rejected because a project was paused or an allowlist proof was invalid.'],
        ],
      },
      {
        h: '4. What the issuer controls',
        p: [
          'If you are a client who claimed an identity, your fee was set by the institution that allowlisted you, and 70% of it went to that institution. Any goodwill refund is a matter between you and them, made outside the protocol. We have no ability to compel or execute it.',
          'If you are an issuer and wish to refund a client, send them a transfer directly from your treasury.',
        ],
      },
      {
        h: '5. Duplicate or erroneous protocol charges',
        p: [
          `If you believe the protocol received funds through a genuine contract fault — for example, a double charge for a single claim — contact ${LEGAL_CONTACT} with the transaction hash. We will investigate, and where a fault on our side is confirmed we will return the protocol’s share at our discretion. This is not a general right of refund.`,
        ],
      },
      {
        h: '6. Before you sign',
        p: [
          'Every state-changing action in this console opens a review drawer showing exactly what will change, and destructive actions require you to type a confirmation word. Read those summaries. They exist precisely because this policy cannot offer you a way back.',
        ],
      },
    ],
  },
}

export const LEGAL_ORDER = ['privacy', 'terms', 'refunds']

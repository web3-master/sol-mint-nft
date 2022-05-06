import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolMintNft } from "../target/types/sol_mint_nft";

import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createInitializeMintInstruction,
  MINT_SIZE,
} from "@solana/spl-token";

const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

const nftName = "Animal(97): Elephant";
const nftDescription = "This is animal nft of daniel's elephant.";
const nftSymbol = "ZooNft";
const nftImageUrl = "https://bafybeihshos2fqh5nlz27j26fyvfy3ctwd2t3rgjoslsmmzxzykxhzwbea.ipfs.infura-ipfs.io";

async function ipfs_metadata_upload() {
  const ipfsClient = require("ipfs-http-client");
  const ipfs = ipfsClient.create({
    host: "ipfs.infura.io",
    port: 5001,
    protocol: "https",
  });

  const nftMetadata = {
    name: nftName,
    symbol: nftSymbol,
    description: nftDescription,
    image: nftImageUrl,
    attributes: [
      {
        trait_type: "size",
        value: "very big"
      },
      {
        trait_type: "live in",
        value: "land"
      },
      {
        trait_type: "food",
        value: "glass"
      }
    ]
  };
  const nftMetadataIpfs = await ipfs.add(JSON.stringify(nftMetadata));
  if (nftMetadataIpfs == null) {
    return '';
  } else {
    return nftMetadataIpfs.path;
  }
};

async function sol_mint_nft() {
  var metadataUri = await ipfs_metadata_upload();
  if (metadataUri == '') {
    console.log("IPFS metadata upload failed!");
    return;
  }
  metadataUri = `https://ipfs.infura.io/ipfs/${metadataUri}`;
  console.log("IPFS metadata uri: ", metadataUri);

// describe("sol-mint-nft", async () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider);

  const program = anchor.workspace.SolMintNft as Program<SolMintNft>;
  console.log("Program Id: ", program.programId.toBase58());
  console.log('Mint Size: ', MINT_SIZE);
  const lamports = await program.provider.connection.getMinimumBalanceForRentExemption(MINT_SIZE);
  console.log("Mint Account Lamports: ", lamports);

  const getMetadata = async (mint: anchor.web3.PublicKey): Promise<anchor.web3.PublicKey> => {
    return (await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    ))[0];
  };

  const mintKey: anchor.web3.Keypair = anchor.web3.Keypair.generate();

  const nftTokenAccount = await getAssociatedTokenAddress(
    mintKey.publicKey,
    provider.wallet.publicKey
  );
  console.log("NFT Account: ", nftTokenAccount.toBase58());

  const mint_tx = new anchor.web3.Transaction().add(
    anchor.web3.SystemProgram.createAccount({
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey: mintKey.publicKey,
      space: MINT_SIZE,
      programId: TOKEN_PROGRAM_ID,
      lamports,
    }),
    createInitializeMintInstruction(
      mintKey.publicKey,
      0,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
    ),
    createAssociatedTokenAccountInstruction(
      provider.wallet.publicKey,
      nftTokenAccount,
      provider.wallet.publicKey,
      mintKey.publicKey
    )
  );
  const res = await program.provider.sendAndConfirm(mint_tx, [mintKey]);
  console.log("Mint key: ", mintKey.publicKey.toString());
  console.log("User: ", provider.wallet.publicKey.toString());

  const metadataAddress = await getMetadata(mintKey.publicKey);
  console.log("Metadata address: ", metadataAddress.toBase58());

  // it("Is initialized!", async () => {
    const tx = await program.rpc.mintNft(
      mintKey.publicKey,
      nftName,
      nftSymbol,
      metadataUri,
      {
        accounts: {
          mintAuthority: provider.wallet.publicKey,
          mint: mintKey.publicKey,
          tokenAccount: nftTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          metadata: metadataAddress,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          payer: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        }
      }
    );
    console.log("Your transaction signature", tx);
  // });
// });
};

sol_mint_nft();
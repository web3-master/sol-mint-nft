import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolMintNft } from "../target/types/sol_mint_nft";

describe("sol-mint-nft", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolMintNft as Program<SolMintNft>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});

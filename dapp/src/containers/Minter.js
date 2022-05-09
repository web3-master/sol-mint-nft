import {
  Button,
  Card,
  Form,
  Input,
  Upload,
  Row,
  Col,
  notification,
  Alert,
  Result,
  Radio,
  InputNumber,
  DatePicker,
} from "antd";
import { useNavigate } from "react-router-dom";
import { useForm } from "antd/lib/form/Form";
import { InboxOutlined } from "@ant-design/icons";
import { useContext, useState } from "react";

import * as ipfsClient from "ipfs-http-client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";

import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";

import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createInitializeMintInstruction,
  MINT_SIZE,
} from "@solana/spl-token";

import SolMintNftIdl from "../idl/sol_mint_nft.json";

const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

const SOL_MINT_NFT_PROGRAM_ID = new anchor.web3.PublicKey(
  "9FKLho9AUYScrrKgJbG1mExt5nSgEfk1CNEbR8qBwKTZ"
);

const NFT_SYMBOL = "ani-nft";

const ipfs = ipfsClient.create({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
});

const Minter = () => {
  let navigate = useNavigate();
  const { connection } = useConnection();
  const wallet = useWallet();

  const [form] = useForm();
  const [imageFileBuffer, setImageFileBuffer] = useState(null);
  const [saleType, setSaleType] = useState("no_sale");

  const [uploading, setUploading] = useState(false);
  const [minting, setMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);

  const onFileSelected = (file) => {
    const reader = new window.FileReader();
    reader.readAsArrayBuffer(file);
    reader.onloadend = () => {
      setImageFileBuffer(Buffer(reader.result));
    };
    return false;
  };

  const onCreate = async (values) => {
    console.log("Connection: ", connection);
    console.log("Wallet: ", wallet);

    let {
      name,
      description,
      trait_size,
      trait_live_in,
      trait_food,
      sale_type,
      price,
      min_bid_price,
      auction_period,
    } = values;

    let uploadedImageUrl = await uploadImageToIpfs();
    if (uploadImageToIpfs == null) return;
    console.log("Uploaded image url: ", uploadedImageUrl);

    let uploadedMetatdataUrl = await uploadMetadataToIpfs(
      name,
      NFT_SYMBOL,
      description,
      uploadedImageUrl,
      trait_size,
      trait_live_in,
      trait_food
    );
    if (uploadedMetatdataUrl == null) return;
    console.log("Uploaded meta data url: ", uploadedMetatdataUrl);

    setMinting(true);
    const result = await mint(name, NFT_SYMBOL, uploadedMetatdataUrl);
    setMinting(false);
    setMintSuccess(result);
  };

  const uploadImageToIpfs = async () => {
    setUploading(true);
    const uploadedImage = await ipfs.add(imageFileBuffer);
    setUploading(false);

    if (!uploadedImage) {
      notification["error"]({
        message: "Error",
        description: "Something went wrong when updloading the file",
      });
      return null;
    }

    return `https://ipfs.infura.io/ipfs/${uploadedImage.path}`;
  };

  const uploadMetadataToIpfs = async (
    name,
    symbol,
    description,
    uploadedImage,
    traitSize,
    traitLiveIn,
    traitFood
  ) => {
    const metadata = {
      name,
      symbol,
      description,
      image: uploadedImage,
      attributes: [
        {
          trait_type: "size",
          value: traitSize,
        },
        {
          trait_type: "live in",
          value: traitLiveIn,
        },
        {
          trait_type: "food",
          value: traitFood,
        },
      ],
    };

    setUploading(true);
    const uploadedMetadata = await ipfs.add(JSON.stringify(metadata));
    setUploading(false);

    if (uploadedMetadata == null) {
      return null;
    } else {
      return `https://ipfs.infura.io/ipfs/${uploadedMetadata.path}`;
    }
  };

  const mint = async (name, symbol, metadataUrl) => {
    const provider = new anchor.AnchorProvider(connection, wallet);
    anchor.setProvider(provider);

    const program = new Program(
      SolMintNftIdl,
      SOL_MINT_NFT_PROGRAM_ID,
      provider
    );
    console.log("Program Id: ", program.programId.toBase58());
    console.log("Mint Size: ", MINT_SIZE);
    const lamports =
      await program.provider.connection.getMinimumBalanceForRentExemption(
        MINT_SIZE
      );
    console.log("Mint Account Lamports: ", lamports);

    const getMetadata = async (mint) => {
      return (
        await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from("metadata"),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mint.toBuffer(),
          ],
          TOKEN_METADATA_PROGRAM_ID
        )
      )[0];
    };

    const mintKey = anchor.web3.Keypair.generate();

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
        provider.wallet.publicKey
      ),
      createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        nftTokenAccount,
        provider.wallet.publicKey,
        mintKey.publicKey
      )
    );
    let blockhashObj = await connection.getLatestBlockhash();
    console.log("blockhashObj", blockhashObj);
    mint_tx.recentBlockhash = blockhashObj.blockhash;

    try {
      const signature = await wallet.sendTransaction(mint_tx, connection, {
        signers: [mintKey],
      });
      await connection.confirmTransaction(signature, "confirmed");
    } catch {
      return false;
    }

    console.log("Mint key: ", mintKey.publicKey.toString());
    console.log("User: ", provider.wallet.publicKey.toString());

    const metadataAddress = await getMetadata(mintKey.publicKey);
    console.log("Metadata address: ", metadataAddress.toBase58());

    try {
      const tx = program.transaction.mintNft(
        mintKey.publicKey,
        name,
        symbol,
        metadataUrl,
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
          },
        }
      );

      const signature = await wallet.sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");
      console.log("Mint Success!");
      return true;
    } catch {
      return false;
    }
  };

  const onMintAgain = () => {
    setMintSuccess(false);
    form.resetFields();
  };

  if (mintSuccess) {
    return (
      <Result
        style={{ marginTop: 60 }}
        status="success"
        title="Successfully minted new NFT!"
        subTitle="You can check this new NFT in your wallet."
        extra={[
          <Button key="buy" onClick={onMintAgain}>
            Mint Again
          </Button>,
        ]}
      />
    );
  }

  return (
    <Row style={{ margin: 60 }}>
      {minting && (
        <Col span={16} offset={4}>
          <Alert message="Minting..." type="info" showIcon />
        </Col>
      )}
      {uploading && (
        <Col span={16} offset={4}>
          <Alert message="Uploading image..." type="info" showIcon />
        </Col>
      )}
      <Col span={16} offset={4} style={{ marginTop: 10 }}>
        <Card title="Create New NFT">
          <Form
            form={form}
            layout="vertical"
            labelCol={8}
            wrapperCol={16}
            onFinish={onCreate}
          >
            <Row gutter={24}>
              <Col xl={12} span={24}>
                <Form.Item
                  label="Image"
                  name="image"
                  rules={[{ required: true, message: "Please select image!" }]}
                >
                  <Upload.Dragger
                    name="image"
                    beforeUpload={onFileSelected}
                    maxCount={1}
                    height={400}
                  >
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">
                      Click or drag file to this area to upload
                    </p>
                    <p className="ant-upload-hint">
                      Support for a singe image.
                    </p>
                  </Upload.Dragger>
                </Form.Item>
              </Col>
              <Col xl={12} span={24}>
                <Form.Item
                  label="Name"
                  name="name"
                  rules={[{ required: true, message: "Please input name!" }]}
                >
                  <Input placeholder="Input nft name here." />
                </Form.Item>

                <Form.Item
                  label="Description"
                  name="description"
                  rules={[
                    { required: true, message: "Please input description!" },
                  ]}
                >
                  <Input.TextArea placeholder="Input nft description here." />
                </Form.Item>

                <Form.Item label="Traits">
                  <Input.Group size="large">
                    <Row gutter={12}>
                      <Col span={8}>
                        <Form.Item
                          name="trait_size"
                          rules={[
                            {
                              required: true,
                              message: "Please input size!",
                            },
                          ]}
                        >
                          <Input addonBefore="Size" placeholder="size" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          name="trait_live_in"
                          rules={[
                            {
                              required: true,
                              message: "Please input live in!",
                            },
                          ]}
                        >
                          <Input addonBefore="Live in" placeholder="live in" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          name="trait_food"
                          rules={[
                            {
                              required: true,
                              message: "Please input food!",
                            },
                          ]}
                        >
                          <Input addonBefore="Food" placeholder="food" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Input.Group>
                </Form.Item>

                <Form.Item label="Place On Marketplace" name="sale_type">
                  <Radio.Group
                    style={{ width: "100%" }}
                    onChange={(e) => setSaleType(e.target.value)}
                  >
                    <Row gutter={12}>
                      <Col span={8}>
                        <Radio.Button style={{ width: "100%" }} value="no_sale">
                          No Sale
                        </Radio.Button>
                      </Col>
                      <Col span={8}>
                        <Radio.Button
                          style={{ width: "100%" }}
                          value="fixed_price_sale"
                        >
                          Fixed Price Sale
                        </Radio.Button>
                      </Col>
                      <Col span={8}>
                        <Radio.Button style={{ width: "100%" }} value="auction">
                          Auction
                        </Radio.Button>
                      </Col>
                    </Row>
                  </Radio.Group>
                </Form.Item>

                {saleType == "fixed_price_sale" && (
                  <Form.Item
                    name="price"
                    label="Price"
                    rules={[{ required: true, message: "Please input price!" }]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      placeholder="Input your price"
                      addonAfter="SOL"
                    />
                  </Form.Item>
                )}

                {saleType == "auction" && (
                  <>
                    <Form.Item
                      name="min_bid_price"
                      label="Minimum Bid Price"
                      rules={[
                        {
                          required: true,
                          message: "Please input minimum bid price!",
                        },
                      ]}
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        placeholder="Input your minimum bid price"
                        addonAfter="SOL"
                      />
                    </Form.Item>
                    <Form.Item
                      label="Auction Period"
                      name="auction_period"
                      rules={[
                        {
                          type: "array",
                          required: true,
                          message: "Please select time!",
                        },
                      ]}
                    >
                      <DatePicker.RangePicker
                        showTime
                        format="YYYY-MM-DD HH:mm:ss"
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                  </>
                )}
              </Col>
            </Row>

            <Form.Item wrapperCol={{ offset: 6, span: 12 }}>
              <Button type="primary" htmlType="submit" style={{ width: 200 }}>
                Create
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Col>
    </Row>
  );
};

export default Minter;

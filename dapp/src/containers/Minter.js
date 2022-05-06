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
} from "antd";
import { useNavigate } from "react-router-dom";
import { useForm } from "antd/lib/form/Form";
import { InboxOutlined } from "@ant-design/icons";
import { useContext, useState } from "react";

const Minter = () => {
  let navigate = useNavigate();

  const [form] = useForm();
  const [imageFileBuffer, setImageFileBuffer] = useState(null);
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

  const onCreate = async (values) => {};

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
        <Col span={12} offset={6}>
          <Alert message="Minting..." type="info" showIcon />
        </Col>
      )}
      {uploading && (
        <Col span={12} offset={6}>
          <Alert message="Uploading image..." type="info" showIcon />
        </Col>
      )}
      <Col span={12} offset={6} style={{ marginTop: 10 }}>
        <Card title="Create New NFT">
          <Form
            form={form}
            layout="vertical"
            labelCol={8}
            wrapperCol={16}
            onFinish={onCreate}
          >
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
              rules={[{ required: true, message: "Please input description!" }]}
            >
              <Input.TextArea placeholder="Input nft description here." />
            </Form.Item>

            <Form.Item
              label="Image"
              name="image"
              rules={[{ required: true, message: "Please select image!" }]}
            >
              <Upload.Dragger
                name="image"
                beforeUpload={onFileSelected}
                maxCount={1}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">
                  Click or drag file to this area to upload
                </p>
                <p className="ant-upload-hint">Support for a singe image.</p>
              </Upload.Dragger>
            </Form.Item>

            <Form.Item wrapperCol={{ offset: 6, span: 12 }}>
              <Button type="primary" htmlType="submit">
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

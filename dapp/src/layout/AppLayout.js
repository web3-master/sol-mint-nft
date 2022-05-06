import { Layout, Row, Col } from "antd";
import { Content, Footer, Header } from "antd/lib/layout/layout";
import Minter from "../containers/Minter";
import WrongNetwork from "../containers/WrongNetwork";
import logo from "../images/sol.png";
import { Route, Routes } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const AppLayout = () => {
  return (
    <Row>
      <Col span={24}>
        <Layout style={{ minHeight: "100vh" }}>
          <Header>
            <Row align="stretch" gutter={20}>
              <Col>
                <img src={logo} width={40} height={40} />
              </Col>
              <Col>
                <h1>
                  <font color="white">Solana NFT Minter</font>
                </h1>
              </Col>
              <Col flex="auto"></Col>
              <Col style={{ marginRight: 10 }}>
                <WalletMultiButton className="wallet-button" />
              </Col>
            </Row>
          </Header>
          <Content>
            <Routes>
              <Route path="/" element={<Minter />} />
              <Route path="/mint" element={<Minter />} />
            </Routes>
          </Content>
          <Footer
            style={{
              position: "sticky",
              bottom: 0,
            }}
          >
            © 2022 All rights reserved by Daniel Armstrong.
          </Footer>
        </Layout>
      </Col>
    </Row>
  );
};

export default AppLayout;

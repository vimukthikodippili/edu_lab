import PageTitle from '@/components/PageTitle';
import { Col, Row } from 'react-bootstrap';
import InvoicesCard from './components/InvoiceCard';
export const metadata = {
  title: 'Invoices'
};
const InvoicesPage = () => {
  return <>
      <PageTitle title="Invoices" subTitle="" />
      <Row>
        <Col xs={12}>
          <InvoicesCard />
        </Col>
      </Row>
    </>;
};
export default InvoicesPage;
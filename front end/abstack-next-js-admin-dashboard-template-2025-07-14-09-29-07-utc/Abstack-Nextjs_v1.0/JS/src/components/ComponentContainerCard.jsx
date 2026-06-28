import { Card, CardBody, CardHeader } from 'react-bootstrap';
const ComponentContainerCard = ({
  title,
  description,
  children
}) => {
  return <Card>
      <CardHeader className="border-0 border-bottom border-dashed">
        <h4 className="header-title">{title}</h4>
      </CardHeader>
      <CardBody>
        {description && <p className="text-muted">{description}</p>}
        {children}
      </CardBody>
    </Card>;
};
export default ComponentContainerCard;
import { connected, connectionStore } from '../../redux/connectionStore';

import Button from '../Button';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import React from 'react';
import { networkNames } from '../../utils/networkMap';

type Props = {
  show: boolean,
  onHide: () => void,
};

type State = {
  networkId: string,
  account: string | undefined
};

const initialState: State = {
  networkId: '0x5',
  account: '0xAF3e8346F1B57B0915851dBA3a1CDE65CF8dF522'
};

export default class PlainTextLoginModal extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = initialState;
  }

  connected = () => {
    connectionStore.dispatch(connected({
      networkId: this.state.networkId,
      account: this.state.account
    }));
  };

  render() {
    const networkName = networkNames[connectionStore.getState().networkId];
    const networkOptions = Object.keys(networkNames).map(networkId => (
      <Dropdown.Item key={networkId} eventKey={networkId} active={this.state.networkId === networkId}>{networkNames[networkId]}</Dropdown.Item>
    ));

    return (
      <Modal show={this.props.show} onHide={this.props.onHide}>
        <Modal.Header closeButton>
          <Modal.Title>Connect using plain-text</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>This is an alternate decentralized connection method, if you prefer to not use Metamask yet.</p>
          <p>This will allow you to view orders, which are stored on the blockchain.</p>
          <h6>Wallet address:</h6>
          <Form.Control type="text" placeholder="e.g.: '0xAF3e8346F1B57B0915851dBA3a1CDE65CF8dF522'" defaultValue={this.state.account} onChange={e => this.setState({ account: e.target.value })} />
          <h6>Network:</h6>
          <DropdownButton title={networkNames[this.state.networkId]} onSelect={networkId => networkId && this.setState({ networkId })} variant="dark">
            {networkOptions}
          </DropdownButton>
        </Modal.Body>
        <Modal.Footer>
          <Button className="primary" onClick={this.props.onHide}>
            Cancel
          </Button>
          <Button className="primary" onClick={this.connected}>
            Connect
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
}

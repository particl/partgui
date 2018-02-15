import { Component, ElementRef, ViewChild, HostListener } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { MatDialog } from '@angular/material';
import { Log } from 'ng2-logger';

import { ModalsService } from '../../../modals/modals.service';
import { RpcService } from '../../../core/rpc/rpc.service';
import { RpcStateService } from '../../../core/rpc/rpc-state/rpc-state.service';

import { SendService } from './send.service';
import { SnackbarService } from '../../../core/snackbar/snackbar.service';

import { AddressLookupComponent } from '../addresslookup/addresslookup.component';
import { AddressLookUpCopy } from '../models/address-look-up-copy';
import { SendConfirmationModalComponent } from './send-confirmation-modal/send-confirmation-modal.component';
import { AddressHelper } from '../../shared/util/utils';

@Component({
  selector: 'app-send',
  templateUrl: './send.component.html',
  // TODO merge / globalize styles
  styleUrls: ['./send.component.scss', '../../settings/settings.component.scss']
})
export class SendComponent {


  // General
  log: any = Log.create('send.component');
  private addressHelper: AddressHelper;

  // UI logic
  @ViewChild('address') address: ElementRef;
  type: string = 'sendPayment';
  advanced: boolean = false;
  progress: number = 10;
  // TODO: Create proper Interface / type
  send: any = {
    input: 'balance',
    output: 'blind_balance',
    toAddress: '',
    toLabel: '',
    validAddress: undefined,
    validAmount: undefined,
    isMine: undefined,
    currency: 'part',
    privacy: 8,
    subtractFeeFromAmount: false
  };

  constructor(
    private sendService: SendService,
    private _rpc: RpcService,
    private _rpcState: RpcStateService,
    private _modals: ModalsService,
    private dialog: MatDialog,
    private flashNotification: SnackbarService
  ) {
    this.progress = 50;
    this.addressHelper = new AddressHelper();
  }

  /** Select tab */
  selectTab(tabIndex: number): void {
    this.type = (tabIndex) ? 'balanceTransfer' : 'sendPayment';
    this.send.input = 'balance';
    if (this.type === 'balanceTransfer') {
      this.send.toAddress = '';
      this.send.output = 'blind_balance'
      this.verifyAddress();
    }
    this.updateAmount();
  }

  /** Get current account balance (Public / Blind / Anon) */
  getBalance(account: string): number {
    return this._rpcState.get('getwalletinfo')[account] || 0;
  }

  getBalanceString(account: string): string {
    return this._rpcState.get('getwalletinfo')[account];
  }

  checkBalance(account: string): boolean {
    if (account === 'blind_balance') {
      return parseFloat(this.getBalanceString(account)) < 0.0001 && parseFloat(this.getBalanceString(account)) > 0;
    }
  }

  /** Amount validation functions. */
  checkAmount(): boolean {
    // hooking verifyAmount here, on change of type -> retrigger check of amount.
    this.verifyAmount();

    return this.send.validAmount;
  }

  verifyAmount(): void {

    if (this.send.amount === undefined || +this.send.amount === 0 || this.send.input === '' || this.send.amount === null) {
      this.send.validAmount = undefined;
      return;
    }

    if ((this.send.amount + '').indexOf('.') >= 0 && (this.send.amount + '').split('.')[1].length > 8) {
      this.send.validAmount = false;
      return;
    }

    if (this.send.amount === 1e-8) {
      this.send.validAmount = false;
      return;
    }
    // is amount in range of 0...CurrentBalance
    this.send.validAmount = (this.send.amount <= this.getBalance(this.send.input)
                            && this.send.amount > 0);
  }

  /** checkAddres: returns boolean, so it can be private later. */
  checkAddress(): boolean {
    if (this.send.input !== 'balance' && this.addressHelper.testAddress(this.send.toAddress, 'public')) {
      return false;
    }

    // use default transferBalance address or custom address.
    return (this.type === 'balanceTransfer' && !this.send.toAddress) || this.send.validAddress;
  }

  /** verifyAddress: calls RPC to validate it. */
  verifyAddress() {
    if (!this.send.toAddress) {
      this.send.validAddress = undefined;
      this.send.isMine = undefined;
      return;
    }

    const validateAddressCB = (response) => {
      this.send.validAddress = response.isvalid;

      if (!!response.account) {
        this.send.toLabel = response.account;
      }

      if (!!response.ismine) {
        this.send.isMine = response.ismine;
      }
    };

    this._rpc.call('validateaddress', [this.send.toAddress])
      .subscribe(
        response => validateAddressCB(response),
        error => this.log.er('verifyAddress: validateAddressCB failed'));
  }

  /** Clear the send object. */
  clear(): void {
    this.send = {
      input: this.send.input,
      output: this.send.output,
      validAddress: undefined,
      validAmount: undefined,
      currency: 'part',
      privacy: 50
    };
    this.send.subtractFeeFromAmount = false;
  }

  clearReceiver(): void {
    this.send.toLabel = '';
    this.send.toAddress = '';
    this.send.validAddress = undefined;
  }

  onSubmit(): void {
    const d = this.dialog.open(SendConfirmationModalComponent);
    const dc = d.componentInstance;

    let txt = `Do you really want to send ${this.send.amount} ${this.send.currency.toUpperCase()} to ${this.send.toAddress}?`
    if (this.type === 'balanceTransfer') {
      txt = `Do you really want to transfer the following balance ${this.send.amount} ${this.send.currency.toUpperCase()}?`
    }
    dc.dialogContent = txt;

    dc.onConfirm.subscribe(() => {
      d.close();
      this.pay();
    })
  }

  /** Payment function */
  pay(): void {
    if (this.send.input === '' ) {
      this.flashNotification.open('You need to select an input type (public, blind or anon)!');
      return;
    }

    // Send normal transaction - validation
    if (this.type === 'sendPayment') {

      // pub->pub, blind->blind, priv-> priv
      this.send.output = this.send.input;

      // Check if stealth address if output is private
      if (this.send.output === 'private' && !this.addressHelper.testAddress(this.send.toAddress, 'private')) {
        this.flashNotification.open('Stealth address required for private transactions!');
        return;
      }

    // Balance transfer - validation
    } else if (this.type === 'balanceTransfer') {

      if (this.send.output === '') {
        this.flashNotification.open('You need to select an output type (public, blind or anon)!');
        return;
      }

      if (this.send.input === this.send.output) {
        this.flashNotification.open(`You have selected ${this.send.input}
          twice!\n Balance transfers can only happen between two different types.`);

        return;
      }

    }

    if (this._rpcState.get('locked')) {
      // unlock wallet and send transaction
      this._modals.open('unlock', {forceOpen: true, timeout: 3, callback: this.sendTransaction.bind(this)});
    } else {
      // wallet already unlocked
      this.sendTransaction();
    }
  }

  private sendTransaction(): void {
    if (this.type === 'sendPayment') {
      // edit label of address
      this.addLabelToAddress();

      this.sendService.sendTransaction(
        this.send.input, this.send.output,
        this.send.toAddress, this.send.amount,
        this.send.note, this.send.note,
        this.send.privacy, 1, this.send.subtractFeeFromAmount);
    } else {

      this.sendService.transferBalance(
        this.send.input, this.send.output,
        this.send.amount, this.send.privacy, 1, this.send.subtractFeeFromAmount);
    }
    this.clear();
  }
  /*
    AddressLookup Modal + set details
  */

  openLookup(): void {
    const d = this.dialog.open(AddressLookupComponent);
    const dc = d.componentInstance;
    dc.type = (this.type === 'balanceTransfer') ? 'receive' : 'send';
    dc.filter = (
      ['anon_balance', 'blind_balance'].includes(this.send.input) ? 'Private' : 'All types');
    dc.selectAddressCallback.subscribe((response: AddressLookUpCopy) => {
      this.selectAddress(response);
      d.close();
    });
  }

  /** Select an address, set the appropriate models
    * @param address The address to send to
    * @param label The label for the address.
    */
  selectAddress(copyObject: AddressLookUpCopy): void {
    this.send.toAddress = copyObject.address;
    this.send.toLabel = copyObject.label;
    // this.addressLookup.hide();
    this.verifyAddress();
  }

  /** Add/edits label of an address. */
  addLabelToAddress(): void {
    const isMine = this.send.isMine;

    /*
    if (isMine) {
      if (!confirm('Address is one of our own - change label? ')) {
        return;
      }
    }*/

    const label = this.send.toLabel;
    const addr = this.send.toAddress;

    this._rpc.call('manageaddressbook', ['newsend', addr, label])
      .subscribe(
        response => this.log.er('rpc_addLabel_success: successfully added label to address.'),
        error => this.log.er('rpc_addLabel_failed: failed to add label to address.'))
  }

  setPrivacy(level: number, prog: number): void {
    this.send.privacy = level;
    this.progress = prog;
  }

  pasteAddress(): void {
    // document.getElementById('address').focus();
    this.address.nativeElement.value = window.readClipboard();
  }

  @HostListener('document:paste', ['$event'])
  onPaste(event: any) {
    if (this.addressHelper.addressFromPaste(event)) {
      this.address.nativeElement.focus();
    }
  }

  sendAllBalance(): void {
    this.send.amount = (!this.send.subtractFeeFromAmount) ? this.getBalance(this.send.input) : null;
  }

  updateAmount(): void {
    this.send.amount = (this.send.subtractFeeFromAmount) ? this.getBalance(this.send.input) : null;
  }
}

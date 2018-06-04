import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatDialogRef } from '@angular/material';

import { SendService } from '../send.service';

import { Amount, Fee } from '../../../../core/util/utils';
import { TransactionBuilder } from '../transaction-builder.model';
import { Bid } from '../../../../core/market/api/bid/bid.model';

@Component({
  selector: 'app-send-confirmation-modal',
  templateUrl: './send-confirmation-modal.component.html',
  styleUrls: ['./send-confirmation-modal.component.scss']
})
export class SendConfirmationModalComponent implements OnInit {

  @Output() onConfirm: EventEmitter<string> = new EventEmitter<string>();
  @Input() type: string;

  public dialogContent: string;
  public send: TransactionBuilder;
  public bidItem: Bid;
  public country: string = '';
  // send-confirmation-modal variables
  transactionType: string = '';
  sendAmount: Amount = new Amount(0);
  sendAddress: string = '';
  receiverName: string = '';
  transactionAmount: Fee = new Fee(0);

  constructor(private dialogRef: MatDialogRef<SendConfirmationModalComponent>,
              private sendService: SendService) {
  }

  ngOnInit() {
    if (this.type === 'tx') {
      this.setTxDetails();
    }
    if (this.type === 'bid') {
      this.country = this.bidItem.ShippingAddress.country;
    }
  }

  confirm(): void {
    this.onConfirm.emit();
    this.dialogClose();
  }

  dialogClose(): void {
    this.dialogRef.close();
  }

  /**
    * Set the confirmation modal data for tx
    */
  setTxDetails(): void {
    this.getTransactionFee();

    this.sendAddress = this.send.toAddress;
    this.transactionType = this.send.input;
    this.sendAmount = new Amount(this.send.amount);
    this.receiverName = this.send.toLabel;
  }

  getTransactionFee() {
    this.sendService.getTransactionFee(this.send).subscribe(fee => {
      this.transactionAmount = new Fee(fee.fee);
    });
  }

}

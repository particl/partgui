import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { Log } from 'ng2-logger';

import { AddressService } from '../address.service';
import { Address } from '../address.model';

import { RPCService } from '../../../core/rpc/rpc.module';

@Component({
  selector: 'address-table',
  templateUrl: './address-table.component.html',
  styleUrls: ['./address-table.component.scss']
})
export class AddressTableComponent implements OnInit {

  /* Determines what fields are displayed in the Transaction Table. */
    /* header and utils */
  @Input() displayHeader: boolean = true;
  @Input() displayInternalHeader: boolean = false;
  @Input() displayToolsMenu: boolean = true;
  @Input() displayQrMenu: boolean = true;
  @Input() displayPagination: boolean = false;

    /* actual fields */
  @Input() displayLabel: boolean = true;
  @Input() displayType: boolean = false;
  @Input() displayAddress: boolean = true;
  @Input() displayPublicKey: boolean = false;
  @Input() displayPurpose: boolean = false;
  @Input() displayIsMine: boolean = false;

  @Output() editLabelEmitter: EventEmitter<string> = new EventEmitter<string>();

  /*
    Search query
  */
  @Input() query: string;

  /*
    Data storage
  */
  private addresses: Address[] = [];
  private _subAddresses: Subscription;

  /*
    Pagination
  */
  currentPage: number = 1;
  @Input() addressDisplayAmount: number = 5;

  /*
    General
  */
  log: any = Log.create('address-table.component');

  constructor(
    private _addressService: AddressService,
    private _rpc: RPCService
  ) {

  }

  ngOnInit() {
    this._subAddresses = this._addressService.getAddresses()
      .subscribe(
        addresses => {
          this.addresses = addresses;
        },
        error => console.log('addresstable-component subscription error:' + error));
  }


/**
 * Returns the addresses to display in the UI with regards to both pagination and search/query.
 * @returns      Object[]
 */
  public getSinglePage(): Array<Address> {
    if (this.inSearchMode()) { // in search mode
      return this.paginateArray(this.getSearchSubset());

    } else { // not in seach mode
      return this.paginateArray(this.addresses);
    }
  }

  private inSearchMode(): boolean {
    return (this.query !== undefined && this.query !== '');
  }


/**
 * Returns the addresses that match a search/query.
 * @returns      Object[]
 */
  private getSearchSubset(): Address[] {
    return this.addresses.filter(el => {
        return (
          el.label.toLowerCase().indexOf(this.query.toLowerCase()) !== -1
          || el.address.toLowerCase().indexOf(this.query.toLowerCase()) !== -1
        );
      });
  }

// ------------------

/*
  Pagination
*/


/**
 * Returns the addresses to display in the UI with regards to the pagination parameters
 */
  private paginateArray(tempAddresses: Address[]): Address[] {
    if (tempAddresses !== undefined) {
      return tempAddresses.slice(((this.currentPage - 1) * this.addressDisplayAmount), this.currentPage * this.addressDisplayAmount);
    } else {
      return [];
    }
  }

  public getTotalAddressCount(): number {
    if (this.inSearchMode()) {
      return this.getSearchSubset().length;
    } else {
      return this.addresses.length;
    }
  }

  public getMaxAddressesPerPage(): number {
    return this.addressDisplayAmount;
  }

// ------------------

/*
  Delete address
*/

  public deleteAddress(label: string, address: string) {
    if (confirm(`Are you sure you want to delete ${label}: ${address}`)) {
      this._rpc.call(this, 'manageaddressbook', ['del', address], this.rpc_deleteAddress_success);
    }
  }

  private rpc_deleteAddress_success(json: Object) {
    alert(`Succesfully deleted ${json['address']}`);
    this._rpc.specialPoll();
  }

// ------------------

/*
  Edit label address
*/

  editLabel(address: string) {
    this.log.d(`editLabel, address: ${address}`);
    this.editLabelEmitter.emit(address);
  }
}


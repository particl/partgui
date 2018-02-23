import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-multiwallet',
  templateUrl: './multiwallet.component.html',
  styleUrls: ['./multiwallet.component.scss']
})
export class MultiwalletComponent implements OnInit {

  wallet_selections: Array<any> = ['wallet.dat', 'wallet-work.dat', 'wallet-old.dat', 'shop.dat'];

  constructor() { }

  ngOnInit() {
  }

}

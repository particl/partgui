import { Component, Inject, forwardRef, ViewChild, ElementRef, ComponentRef } from '@angular/core';
import { Log } from 'ng2-logger';

import { IPassword } from '../shared/password/password.interface';

import { PassphraseComponent } from './passphrase/passphrase.component';
import { PassphraseService } from './passphrase/passphrase.service';

import { flyInOut, slideDown } from './createwallet.animations';

@Component({
  selector: 'modal-createwallet',
  templateUrl: './createwallet.component.html',
  styleUrls: ['./createwallet.component.scss'],
  animations: [
    flyInOut(),
    slideDown()
  ],
})
export class CreateWalletComponent {

  log: any = Log.create('createwallet.component');

  animationState: string;

  step: number = 0;
  isRestore: boolean = false;
  name: string;

  @ViewChild('nameField') nameField: ElementRef;

  password: string;
  words: string[];

  @ViewChild('passphraseComponent') passphraseComponent: ComponentRef<PassphraseComponent>;

  // Used for verification
  private wordsVerification: string[];
  private validating: boolean = false;

  errorString: string = '';

  constructor (
    private _passphraseService: PassphraseService
  ) {
    this.reset();
  }

  reset() {
    this._modalsService.enableClose = true;
    this.words = Array(24).fill('');
    this.isRestore = false;
    this.name = '';
    this.password = '';
    this.errorString = '';
    this.step = 0;
  }

  create () {
    this.reset();
    this.step = 1;
  }

  restore() {
    this.reset();
    this.isRestore = true;
    this.step = 1;
  }

  nextStep() {
    this.validating = true;

    if (this.validate()) {
      this.animationState = 'next';
      this.validating = false;
      this.step++;
      setTimeout(() => this.animationState = '', 300);
      this.doStep();
    }

  }

  prevStep() {
    this.animationState = 'prev';
    this.step--;
    setTimeout(() => this.animationState = '', 300);
    this.doStep();
  }

  doStep() {
    switch (this.step) {
      case 1:
        setTimeout(() => this.nameField.nativeElement.focus(this), 1);
        break;
      case 2:
        if (this.isRestore) {
          this.step = 4;
        }
        break;
      case 3:
        this._passphraseService.generateMnemonic(this.mnemonicCallback.bind(this), this.password);
        break;
      case 4:
        while (this.words.reduce((prev, curr) => prev + +(curr === ''), 0) < 5) {
          const k = Math.floor(Math.random() * 23);

          this.words[k] = '';
        }
        break;
      case 5:
        this.animationState = '';
        this.step = 4;
        this.errorString = '';

        this._passphraseService.importMnemonic(this.words, this.password)
          .subscribe(
            success => {
              this.log.i('Mnemonic imported successfully');
              this.animationState = 'next';
              this.step = 5;
            },
            error => {
              this.log.er(error);
              this.errorString = error.error.message;
              this.log.er('Mnemonic import failed');
            });
        break;
    }

    this._modalsService.enableClose = (this.step === 0);
  }

  private mnemonicCallback(response: Object) {
    const words = response['mnemonic'].split(' ');

    if (words.length > 1) {
      this.words = words;
    }

    this.wordsVerification = Object.assign({}, this.words);
    this.log.d(`word string: ${this.words.join(' ')}`);
  }

  validate(): boolean {
    if (this.validating && this.step === 1) {
      return !!this.name;
    }
    if (this.validating && this.step === 4 && !this.isRestore) {
      return !this.words.filter((value, index) => this.wordsVerification[index] !== value).length;
    }

    return true;
  }

  passwordFromEmitter(pass: IPassword) {
    this.password = pass.password;
  }

  wordsFromEmitter(words: string) {
    this.words = words.split(',');
  }

  close() {
    this.reset();
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.body.dispatchEvent(escape);
  }
}

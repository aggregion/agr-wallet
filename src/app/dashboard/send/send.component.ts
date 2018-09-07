import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {AccountsService} from '../../accounts.service';
import {AGRJSService} from '../../eosjs.service';
import {Observable} from 'rxjs';
import {map, startWith} from 'rxjs/operators';
import {createNumberMask} from 'text-mask-addons/dist/textMaskAddons';
import {BodyOutputType, Toast, ToasterConfig, ToasterService} from 'angular2-toaster';
import {CryptoService} from '../../services/crypto.service';
import {AGRAccount} from '../../interfaces/account';

import * as moment from 'moment';

export interface Contact {
  name: string;
  type: string;
  account?: string;
  default_memo?: string;
}

@Component({
  selector: 'app-send',
  templateUrl: './send.component.html',
  styleUrls: ['./send.component.css'],
})
export class SendComponent implements OnInit {
  contacts: Contact[];
  sendForm: FormGroup;
  contactForm: FormGroup;
  searchForm: FormGroup;
  confirmForm: FormGroup;
  sendModal: boolean;
  newContactModal: boolean;
  editContactModal: boolean;
  deleteContactModal: boolean;
  accountvalid: boolean;
  busy: boolean;
  add: boolean;
  errormsg: string;
  adderrormsg: string;
  amounterror: string;
  wrongpass: string;
  fullBalance: number;
  staked: number;
  unstaked: number;
  unstaking: number;
  unstakeTime: string;
  contactExist: boolean;
  search: string;
  filteredContacts: Observable<Contact[]>;
  searchedContacts: Observable<Contact[]>;
  numberMask = createNumberMask({
    prefix: '',
    allowDecimal: true,
    includeThousandsSeparator: false,
    decimalLimit: 4,
  });
  config: ToasterConfig;
  fromAccount: string;
  token_balance = 0.0000;
  selectedToken = {
    name: 'AGR',
    price: 1.0000
  };
  selectedEditContact = null;

  knownExchanges = [
    'bitfinexdep1', 'krakenkraken', 'chainceoneos',
    'huobideposit', 'zbeoscharge1', 'okbtothemoon',
    'gateiowallet', 'eosusrwallet', 'binancecleos'];
  memoMsg = 'optional';

  constructor(private fb: FormBuilder,
              public aService: AccountsService,
              public eos: AGRJSService,
              private crypto: CryptoService,
              private toaster: ToasterService) {
    this.sendModal = false;
    this.newContactModal = false;
    this.contactExist = true;
    this.fromAccount = '';
    this.busy = false;
    this.sendForm = this.fb.group({
      token: ['AGR', Validators.required],
      to: ['', Validators.required],
      amount: ['', Validators.required],
      memo: [''],
      add: [false],
      alias: [''],
    });
    this.contactForm = this.fb.group({
      account: ['', Validators.required],
      name: ['', Validators.required],
    });
    this.searchForm = this.fb.group({
      search: ['']
    });
    this.confirmForm = this.fb.group({
      pass: ['', [Validators.required, Validators.minLength(10)]]
    });
    this.contacts = [];
    this.loadContacts();
    this.sortContacts();
    this.errormsg = '';
    this.adderrormsg = '';
    this.amounterror = '';
    this.wrongpass = '';
    this.accountvalid = false;
    this.unstaking = 0;
    this.unstakeTime = '';
  }

  filter(val: string, indexed): Contact[] {
    return this.contacts.filter(contact => {
      if (contact.type === 'contact') {
        return contact.name.toLowerCase().includes(val.toLowerCase()) || contact.account.toLowerCase().includes(val.toLowerCase());
      } else {
        if (indexed) {
          return contact.type === 'letter';
        } else {
          return false;
        }
      }
    });
  }

  checkExchangeAccount() {
    const memo = this.sendForm.get('memo');
    const acc = this.sendForm.get('to').value;
    if (this.knownExchanges.includes(acc)) {
      this.memoMsg = 'required';
      memo.setValidators([Validators.required]);
      memo.updateValueAndValidity();
    } else {
      this.memoMsg = 'optional';
      memo.setValidators(null);
      memo.updateValueAndValidity();
    }
  }

  ngOnInit() {
    this.aService.selected.asObservable().subscribe((sel: AGRAccount) => {
      if (sel) {
        this.fullBalance = sel.full_balance;
        this.staked = sel.staked;
        this.unstaked = sel.full_balance - sel.staked - sel.unstaking;
        this.unstaking = sel.unstaking;
        this.unstakeTime = moment.utc(sel.unstakeTime).add(72, 'hours').fromNow();
      }
    });
    this.sendForm.get('token').valueChanges.subscribe((symbol) => {
      this.sendForm.patchValue({
        amount: ''
      });
      if (symbol !== 'AGR') {
        const tk_idx = this.aService.tokens.findIndex((val) => {
          return val.name === symbol;
        });
        this.selectedToken = this.aService.tokens[tk_idx];
        this.token_balance = this.selectedToken['balance'];
      } else {
        this.selectedToken = {name: 'AGR', price: 1.0000};
      }
    });
    this.filteredContacts = this.sendForm.get('to').valueChanges.pipe(startWith(''), map(value => this.filter(value, false)));
    this.searchedContacts = this.searchForm.get('search').valueChanges.pipe(startWith(''), map(value => this.filter(value, true)));
    this.onChanges();
  }

  onChanges(): void {
    this.sendForm.get('add').valueChanges.subscribe(val => {
      this.add = val;
    });
  }

  checkContact(value) {
    this.checkExchangeAccount();
    const found = this.contacts.findIndex((el) => {
      return el.account === value;
    });
    this.contactExist = found === -1;
  }

  setMax() {
    this.sendForm.patchValue({
      amount: this.sendForm.get('token').value === 'AGR' ? this.unstaked : this.token_balance
    });
  }

  checkAmount() {
    if (parseFloat(this.sendForm.value.amount) === 0 || this.sendForm.value.amount === '') {
      this.sendForm.controls['amount'].setErrors({'incorrect': true});
      this.amounterror = 'invalid amount';
    } else {
      const max = this.sendForm.get('token').value === 'AGR' ? this.unstaked : this.token_balance;
      if (parseFloat(this.sendForm.value.amount) > max) {
        this.sendForm.controls['amount'].setErrors({'incorrect': true});
        this.amounterror = 'invalid amount';
      } else {
        this.sendForm.controls['amount'].setErrors(null);
        this.amounterror = '';
      }
    }
  }

  checkAccountName() {
    if (this.sendForm.value.to !== '') {
      try {
        this.eos.checkAccountName(this.sendForm.value.to.toLowerCase());
        this.sendForm.controls['to'].setErrors(null);
        this.errormsg = '';
        this.eos.getAccountInfo(this.sendForm.value.to.toLowerCase()).then(() => {
          this.sendForm.controls['to'].setErrors(null);
          this.errormsg = '';
        }).catch(() => {
          this.sendForm.controls['to'].setErrors({'incorrect': true});
          this.errormsg = 'account does not exist';
        });
      } catch (e) {
        this.sendForm.controls['to'].setErrors({'incorrect': true});
        this.errormsg = e.message;
      }
    } else {
      this.errormsg = '';
    }
  }

  checkAccountModal() {
    if (this.contactForm.value.account !== '') {
      try {
        this.eos.checkAccountName(this.contactForm.value.account.toLowerCase());
        this.contactForm.controls['account'].setErrors(null);
        this.adderrormsg = '';
        this.eos.getAccountInfo(this.contactForm.value.account.toLowerCase()).then(() => {
          this.contactForm.controls['account'].setErrors(null);
          this.adderrormsg = '';
        }).catch(() => {
          this.contactForm.controls['account'].setErrors({'incorrect': true});
          this.adderrormsg = 'account does not exist';
        });
      } catch (e) {
        this.contactForm.controls['account'].setErrors({'incorrect': true});
        this.adderrormsg = e.message;
      }
    } else {
      this.adderrormsg = '';
    }
  }

  insertNewContact(data, silent) {
    const idx = this.contacts.findIndex((item) => {
      return item.account === data.account;
    });
    if (idx === -1) {
      this.contacts.push(data);
      this.contactForm.reset();
      this.searchForm.patchValue({
        search: ''
      });
    } else {
      if (!silent) {
        alert('duplicate entry');
      }
    }
  }

  addAccountsAsContacts() {
    this.aService.accounts.map(acc => this.insertNewContact({
      type: 'contact',
      name: acc.name,
      account: acc.name
    }, true));
    this.addDividers();
    this.storeContacts();
  }

  removeDividers() {
    this.contacts.forEach((contact, idx) => {
      if (contact.type === 'letter') {
        this.contacts.splice(idx, 1);
      }
    });
  }

  addDividers() {
    this.removeDividers();
    const divs = [];
    this.contacts.forEach((contact) => {
      if (contact.type === 'contact') {
        const letter = contact.name.charAt(0).toUpperCase();
        if (!divs.includes(letter)) {
          divs.push(letter);
          const index = this.contacts.findIndex((item) => {
            return item.name === letter;
          });
          if (index === -1) {
            this.contacts.push({
              type: 'letter',
              name: letter
            });
            this.contactForm.reset();
            this.searchForm.patchValue({
              search: ''
            });
          }
        }
      }
    });
    this.sortContacts();
  }

  addContact() {
    try {
      this.eos.checkAccountName(this.contactForm.value.account.toLowerCase());
      this.eos.getAccountInfo(this.contactForm.value.account.toLowerCase()).then(() => {
        this.insertNewContact({
          type: 'contact',
          name: this.contactForm.value.name,
          account: this.contactForm.value.account.toLowerCase()
        }, false);
        this.newContactModal = false;
        this.addDividers();
        this.storeContacts();
      }).catch((error) => {
        alert(JSON.parse(error.message).error.details[0].message);
      });
    } catch (e) {
      alert('invalid account name!');
      console.log(e);
    }
  }

  addContactOnSend() {
    try {
      this.eos.checkAccountName(this.sendForm.value.to.toLowerCase());
      this.eos.getAccountInfo(this.sendForm.value.to.toLowerCase()).then(() => {
        this.insertNewContact({
          type: 'contact',
          name: this.sendForm.value['alias'],
          account: this.sendForm.value.to.toLowerCase()
        }, false);
        this.addDividers();
        this.storeContacts();
      }).catch((error) => {
        alert(JSON.parse(error.message).error.details[0].message);
      });
    } catch (e) {
      alert('invalid account name!');
      console.log(e);
    }
  }

  sortContacts() {
    this.contacts.sort((a, b) => {
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
    this.searchForm.patchValue({
      search: ''
    });
  }

  selectContact(contact) {
    this.contactExist = true;
    this.sendForm.patchValue({
      to: contact.account,
      alias: contact.name
    });
  }

  storeContacts() {
    localStorage.setItem('simplagr.contacts', JSON.stringify(this.contacts));
  }

  loadContacts() {
    const contacts = localStorage.getItem('simplagr.contacts');
    if (contacts) {
      this.contacts = JSON.parse(contacts);
    } else {
      this.addAccountsAsContacts();
    }
  }

  openSendModal() {
    this.confirmForm.reset();
    this.fromAccount = this.aService.selected.getValue().name;
    this.sendModal = true;
  }

  transfer() {
    this.checkExchangeAccount();
    this.busy = true;
    const selAcc = this.aService.selected.getValue();
    const from = selAcc.name;
    const to = this.sendForm.get('to').value.toLowerCase();
    const amount = parseFloat(this.sendForm.get('amount').value);
    const memo = this.sendForm.get('memo').value;
    const publicKey = selAcc.details['permissions'][0]['required_auth'].keys[0].key;
    if (amount > 0 && this.sendForm.valid) {
      this.crypto.authenticate(this.confirmForm.get('pass').value, publicKey).then((res) => {
        // console.log(res);
        if (res) {
          let contract = 'agrio.token';
          const tk_name = this.sendForm.get('token').value;
          // console.log(tk_name);
          // console.log(this.aService.tokens);
          let precision = 4;
          if (tk_name !== 'AGR') {
            const idx = this.aService.tokens.findIndex((val) => {
              return val.name === tk_name;
            });
            // console.log(idx);
            contract = this.aService.tokens[idx].contract;
            const balance = this.aService.tokens[idx].balance.toString();
            if (balance.indexOf('.') !== -1) {
              precision = balance.split('.')[1].toString().length;
            }
          }
          // console.log(precision);
          // console.log(contract, from, to, amount.toFixed(precision) + ' ' + tk_name, memo);
          this.eos.transfer(contract, from, to, amount.toFixed(precision) + ' ' + tk_name, memo).then((result) => {
            if (result === true) {
              this.wrongpass = '';
              this.sendModal = false;
              this.busy = false;
              this.showToast('success', 'Transation broadcasted', 'Check your history for confirmation.');
              this.aService.refreshFromChain();
              setTimeout(() => {
                const sel = this.aService.selected.getValue();
                this.unstaked = sel.full_balance - sel.staked - sel.unstaking;
              }, 2000);

              this.confirmForm.reset();
              if (this.add === true && this.sendForm.get('alias').value !== '') {
                this.addContactOnSend();
              }
            } else {
              this.wrongpass = JSON.parse(result).error.details[0].message;
              this.busy = false;
            }
          }).catch((error) => {
            console.log('Catch2', error);
            if (error.error.code === 3081001) {
              this.wrongpass = 'Not enough stake to perform this action.';
            } else {
              this.wrongpass = error.error['what'];
            }
            this.busy = false;
          });
        } else {
          this.busy = false;
          this.wrongpass = 'Wrong password!';
        }
      }).catch((err) => {
        console.log(err);
        this.busy = false;
        this.wrongpass = 'Error: Wrong password!';
      });
    }
  }

  private showToast(type: string, title: string, body: string) {
    this.config = new ToasterConfig({
      positionClass: 'toast-top-right',
      timeout: 10000,
      newestOnTop: true,
      tapToDismiss: true,
      preventDuplicates: false,
      animation: 'slideDown',
      limit: 1,
    });
    const toast: Toast = {
      type: type,
      title: title,
      body: body,
      timeout: 10000,
      showCloseButton: true,
      bodyOutputType: BodyOutputType.TrustedHtml,
    };
    this.toaster.popAsync(toast);
  }

  openEditContactModal(contact) {
    console.log(contact);
    this.contactForm.patchValue({
      account: contact.account
    });
    this.editContactModal = true;
    this.selectedEditContact = contact;
  }

  doEditContact() {
    const index = this.contacts.findIndex((el) => {
      return el.account === this.selectedEditContact.account;
    });
    this.contacts[index].name = this.contactForm.get('name').value;
    this.editContactModal = false;
    this.selectedEditContact = null;
    this.contactForm.reset();
    this.addDividers();
    this.storeContacts();
  }

  openDeleteContactModal(contact) {
    this.deleteContactModal = true;
    this.selectedEditContact = contact;
  }

  doDeleteContact() {
    const index = this.contacts.findIndex((el) => {
      return el.account === this.selectedEditContact.account;
    });
    this.contacts.splice(index, 1);
    this.deleteContactModal = false;
    this.addDividers();
    this.storeContacts();
  }

}

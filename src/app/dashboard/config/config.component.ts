import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {AGRJSService} from '../../eosjs.service';
import {AccountsService} from '../../accounts.service';
import {VotingService} from '../vote/voting.service';
import {NetworkService} from '../../network.service';
import {CryptoService} from '../../services/crypto.service';
import {BodyOutputType, Toast, ToasterConfig, ToasterService} from 'angular2-toaster';

@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.css']
})
export class ConfigComponent implements OnInit {
  endpointModal: boolean;
  logoutModal: boolean;
  confirmModal: boolean;
  pinModal: boolean;
  clearPinModal: boolean;
  changePassModal: boolean;
  passForm: FormGroup;
  pinForm: FormGroup;
  passmatch: boolean;
  clearContacts: boolean;
  config: ToasterConfig;

  selectedEndpoint = null;

  static resetApp() {
    window['remote']['app']['relaunch']();
    window['remote']['app'].exit(0);
  }

  constructor(private fb: FormBuilder,
              public voteService: VotingService,
              public network: NetworkService,
              private router: Router,
              private eos: AGRJSService,
              private crypto: CryptoService,
              public aService: AccountsService,
              private toaster: ToasterService) {
    this.endpointModal = false;
    this.logoutModal = false;
    this.confirmModal = false;
    this.pinModal = false;
    this.clearPinModal = false;
    this.clearContacts = false;
    this.changePassModal = false;
    this.passForm = this.fb.group({
      oldpass: ['', [Validators.required, Validators.minLength(10)]],
      matchingPassword: this.fb.group({
        pass1: ['', [Validators.required, Validators.minLength(10)]],
        pass2: ['', [Validators.required, Validators.minLength(10)]]
      })
    });
    this.pinForm = this.fb.group({
      pin: ['', Validators.required],
    });
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

  ngOnInit() {
  }

  logout() {
    if (this.clearContacts) {
      localStorage.clear();
    } else {
      const arr = [];
      for (let i = 0; i < localStorage.length; i++) {
        if (localStorage.key(i) !== 'Aggregion Wallet.contacts') {
          arr.push(localStorage.key(i));
        }
      }
      arr.forEach((k) => {
        localStorage.removeItem(k);
      });
    }
    ConfigComponent.resetApp();
  }

  selectEndpoint(data) {
    this.selectedEndpoint = data;
    this.confirmModal = true;
  }

  connectEndpoint() {
    this.network.selectedEndpoint.next(this.selectedEndpoint);
    this.network.networkingReady.next(false);
    this.network.startup(null);
    this.confirmModal = false;
  }

  connectCustom(url) {
    this.network.selectedEndpoint.next({url: url, owner: 'Other', latency: 0, filters: []});
    this.network.networkingReady.next(false);
    this.network.startup(url);
    this.endpointModal = false;
  }

  changePass() {
    if (this.passmatch) {
      const account = this.aService.selected.getValue();
      const publicKey = account.details['permissions'][0]['required_auth'].keys[0].key;
      this.crypto.authenticate(this.passForm.value.oldpass, publicKey).then(() => {
        this.crypto.changePass(publicKey, this.passForm.value.matchingPassword.pass2).then(() => {
          ConfigComponent.resetApp();
        });
      });
    }
  }

  passCompare() {
    if (this.passForm.value.matchingPassword.pass1 && this.passForm.value.matchingPassword.pass2) {
      if (this.passForm.value.matchingPassword.pass1 === this.passForm.value.matchingPassword.pass2) {
        this.passForm['controls'].matchingPassword['controls']['pass2'].setErrors(null);
        this.passmatch = true;
      } else {
        this.passForm['controls'].matchingPassword['controls']['pass2'].setErrors({'incorrect': true});
        this.passmatch = false;
      }
    }
  }

  clearPin() {
    this.crypto.removePIN();
    this.clearPinModal = false;
    this.showToast('success', 'Lockscreen PIN removed!', '');
  }

  setPIN() {
    if (this.pinForm.value.pin !== '') {
      if (localStorage.getItem('Aggregion Wallet-hash')) {
        this.crypto.updatePIN(this.pinForm.value.pin);
      } else {
        this.crypto.createPIN(this.pinForm.value.pin);
      }
      this.showToast('success', 'New Lockscreen PIN defined!', '');
    }
    this.pinModal = false;
  }


}

import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {EOSJSService} from '../../eosjs.service';
import {AccountsService} from '../../accounts.service';

@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.css']
})
export class ConfigComponent implements OnInit {
  endpointModal: boolean;
  logoutModal: boolean;
  confirmModal: boolean;
  changePassModal: boolean;
  passForm: FormGroup;
  passmatch: boolean;
  clearContacts: boolean;

  constructor(private fb: FormBuilder, private router: Router, private eos: EOSJSService, public aService: AccountsService) {
    this.endpointModal = false;
    this.logoutModal = false;
    this.confirmModal = false;
    this.clearContacts = false;
    this.changePassModal = false;
    this.passForm = this.fb.group({
      oldpass: ['', [Validators.required, Validators.minLength(10)]],
      matchingPassword: this.fb.group({
        pass1: ['', [Validators.required, Validators.minLength(10)]],
        pass2: ['', [Validators.required, Validators.minLength(10)]]
      })
    });
  }

  ngOnInit() {
  }

  logout() {
    if (this.clearContacts) {
      localStorage.clear();
    } else {
      for (let i = 0; i < localStorage.length; i++) {
        if (localStorage.key(i) !== 'simpleos.contacts') {
          localStorage.removeItem(localStorage.key(i));
        }
      }
    }
    this.router.navigateByUrl('/').catch((err) => {
      console.log(err);
    });
  }

  changePass() {
    if (this.passmatch) {
      const name = this.aService.selected.getValue().name;
      this.eos.authenticate(this.passForm.value.oldpass, name).then(() => {
        this.eos.changePass(name, this.passForm.value.matchingPassword.pass2).then(() => {
          window['remote']['app'].relaunch();
          window['remote']['app'].exit(0);
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

}

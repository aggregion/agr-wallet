import {Component, OnInit} from '@angular/core';
import {CryptoService} from '../services/crypto.service';
import {Router} from '@angular/router';
import {NetworkService} from '../network.service';

@Component({
    selector: 'app-lockscreen',
    templateUrl: './lockscreen.component.html',
    styleUrls: ['./lockscreen.component.css']
})
export class LockscreenComponent implements OnInit {

    pin = '';
    nAttempts = 5;
    wrongpass = false;
    logoutModal: boolean;
    clearContacts: boolean;
    anim: any;

    static resetApp() {
        window['remote']['app']['relaunch']();
        window['remote']['app'].exit(0);
    }

    constructor(private crypto: CryptoService, private router: Router, private network: NetworkService) {
        this.logoutModal = false;
        this.clearContacts = false;
    }

    ngOnInit() {
        if (localStorage.getItem('Aggregion Wallet-hash') === null) {
            this.router.navigate(['landing']).catch(() => {
                alert('cannot navigate :(');
            });
        }
    }

    handleAnimation(anim: any) {
        this.anim = anim;
        this.anim['setSpeed'](0.8);
    }

    unlock() {
        let target = ['landing'];
        if (this.network.networkingReady.getValue()) {
            target = ['dashboard', 'wallet'];
        }
        if (!this.crypto.unlock(this.pin, target)) {
            this.wrongpass = true;
            this.nAttempts--;
            if (this.nAttempts === 0) {
                localStorage.clear();
                LockscreenComponent.resetApp();
            }
        }
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
        LockscreenComponent.resetApp();
    }

}

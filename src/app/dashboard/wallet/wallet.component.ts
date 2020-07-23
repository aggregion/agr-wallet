import {AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {AccountsService} from '../../services/accounts.service';
import {FormBuilder, FormGroup} from '@angular/forms';
import {MomentDateAdapter} from '@angular/material-moment-adapter';
import {DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE} from '@angular/material/core';
import * as moment from 'moment';
import {Subscription} from 'rxjs';
import {Paginator} from 'primeng/paginator';
import {Eosjs2Service} from '../../services/eosio/eosjs2.service';
import {NetworkService} from '../../services/network.service';

export const MY_FORMATS = {
    parse: {
        dateInput: 'LL',
    },
    display: {
        dateInput: 'LL',
        monthYearLabel: 'MMM YYYY',
        dateA11yLabel: 'LL',
        monthYearA11yLabel: 'MMMM YYYY',
    },
};

@Component({
    selector: 'app-wallet',
    templateUrl: './wallet.component.html',
    styleUrls: ['./wallet.component.css'],
    providers: [
        {provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE]},
        {provide: MAT_DATE_FORMATS, useValue: MY_FORMATS},
    ],
})
export class WalletComponent implements OnInit, AfterViewInit, OnDestroy {

    fullBalance = 0;
    precision: string;
    staked: number;
    unstaked: number;
    unstaking: 0;
    unstakeTime: string;
    moment: any;
    headBlock: number;
    LIB: number;
    blockTracker: any;
    tokens: any[];
    loading: boolean;
    lottieConfig: Object;
    actionsFilter = [];
    selectedAccountName = '';
    actionMarked = '';
    dateAfter: string;
    dateBefore: string;
    minDate = new Date('2018-06-02T00:00:00.000Z');
    launchDate = new Date('2018-06-02T00:00:00.000Z');
    maxDate = new Date();

    frmFilters: FormGroup;
    private selectedAccountSubscription: Subscription;
    private lastUpdateSubscription: Subscription;

    @ViewChild('paginator') paginator: Paginator;

    maxRows = 12;
    private shouldLazyLoad = true;
    private lastPage = 0;

    constructor(
        public aService: AccountsService,
        public network: NetworkService,
        public eosjs: Eosjs2Service,
        private cdr: ChangeDetectorRef,
        private fb: FormBuilder,
    ) {
        this.moment = moment;
        this.tokens = [];
        this.headBlock = 0;
        this.staked = 0;
        this.unstaked = 0;
        this.LIB = 0;
        this.blockTracker = null;
        this.frmFilters = this.fb.group({
            selectAction: [''],
            startDate: [''],
            endDate: [''],
        });
        this.lottieConfig = {
            path: 'assets/maintenance_anim2.json',
            autoplay: true,
            loop: true,
        };
    }

    ngOnInit() {
        this.actionsFilter = [];
        this.lastUpdateSubscription = this.aService.lastUpdate.asObservable().subscribe(value => {
            if (value.account === this.aService.selected.getValue().name) {
                this.updateBalances();
            }
        });
        this.loading = true;
    }

    ngOnDestroy() {
        if (this.blockTracker) {
            clearInterval(this.blockTracker);
            this.blockTracker = null;
        }
        this.selectedAccountSubscription.unsubscribe();
        this.lastUpdateSubscription.unsubscribe();
    }

    ngAfterViewInit() {

        if (this.network.networkingReady.getValue()) {
            this.getInfo().catch(console.log);
        } else {
            const statusSub = this.network.networkingReady.subscribe((status) => {
                if (status) {
                    this.getInfo().catch(console.log);
                    statusSub.unsubscribe();
                }
            });
        }

        this.selectedAccountSubscription = this.aService.selected.asObservable().subscribe((sel) => {
            if (sel['name']) {
                if (this.selectedAccountName !== sel['name']) {
                    this.selectedAccountName = sel['name'];
                    this.onAccountChanged(sel);
                }
            }
            this.cdr.detectChanges();
        });
    }

    onAccountChanged(sel) {
        this.fullBalance = sel.full_balance;
        this.staked = sel.staked;
        this.unstaking = sel.unstaking;
        this.unstaked = this.fullBalance - this.staked - this.unstaking;
        this.unstakeTime = moment.utc(sel.unstakeTime).add(72, 'hours').fromNow();
        this.tokens = [];
        this.aService.refreshFromChain(false).catch(console.log);
        this.frmFilters.patchValue({
            selectAction: '',
            startDate: '',
            endDate: '',
        });
        this.precision = '1.2-' + this.aService.activeChain.precision;
        this.actionsFilter = this.buildHyperionFilters(sel['name']);
        console.log(`get actions for ${sel.name}`);
        this.loading = true;
        this.aService.getAccActions(sel.name).then(() => {
            this.loading = false;
        }).catch(console.log);
    }

    buildHyperionFilters(name) {
        return [
            {name: 'ALL ACTIONS', filter: ''},
            {name: 'ACCOUNT', filter: '&filter=*:newaccount'},
            {name: 'RECEIVE TOKEN', filter: '&filter=*:transfer&transfer.to=' + name},
            {name: 'SEND TOKEN', filter: '&filter=*:transfer&transfer.from=' + name},
            {name: 'STAKE', filter: '&filter=*:delegatebw'},
            {name: 'UNSTAKE', filter: '&filter=*:undelegatebw'},
            {name: 'VOTE', filter: '&filter=*:voteproducer'},
            {name: 'RAM BUY', filter: '&filter=*:buyrambytes'},
            {name: 'RAM SELL', filter: '&filter=*:sellram'},
            {name: 'BUY REX', filter: '&filter=*:buyrex'},
            {name: 'SELL REX', filter: '&filter=*:sellrex'},
            {name: 'STAKE REX', filter: '&filter=*:mvtosavings'},
            {name: 'UNSTAKE REX', filter: '&filter=*:mvfrsavings'},
            {name: 'RENT CPU', filter: '&filter=*:rentcpu'},
            {name: 'RENT NET', filter: '&filter=*:rentnet'},
        ];
    }

    openTX(value) {
        window['shell']['openExternal'](this.aService.activeChain['explorers'][0]['tx_url'] + value);
    }

    openAccount(acct?: string) {
        if (acct && this.aService.activeChain['explorers'][0]) {
            window['shell']['openExternal'](this.aService.activeChain['explorers'][0]['account_url'] + acct);
        } else {
            window['shell']['openExternal'](this.aService.activeChain['explorers'][0]['account_url'] + this.aService.selected.getValue().name);
        }
    }

    async getInfo() {
        const info = await this.eosjs.rpc.get_info();
        this.headBlock = info.head_block_num;
        this.LIB = info.last_irreversible_block_num;
    }

    choosedAction(val) {
        this.actionMarked = val;
        this.loadActionsLazy(0).catch(console.log);

    }

    choosedAfterDate(val) {
        this.dateAfter = val !== null ? moment.utc(val).set({
            hour: 0,
            minute: 0,
            second: 0,
            millisecond: 0,
        }).format() : '';
        this.minDate = new Date(val);
        this.loadActionsLazy(0).catch(console.log);
    }

    choosedBeforeDate(val) {
        this.dateBefore = val !== null ? moment.utc(val).set({
            hour: 0,
            minute: 0,
            second: 0,
            millisecond: 0,
        }).format() : '';
        this.maxDate = new Date(val);
        this.loadActionsLazy(0).catch(console.log);
    }

    async loadActionsLazy(e?: any) {
        if (this.shouldLazyLoad) {
            let pos = e !== 0 ? e.first : 0;
            let _skip = e !== 0 ? e.first : 0;
            const account = this.aService.selected.getValue().name;

            if (this.paginator.getPage() > this.lastPage) {
                const diff = this.paginator.getPage() - this.lastPage;
                this.lastPage = this.paginator.getPage();
                if (this.aService.actions.length > 0) {
                    const lastAction = this.aService.actions[this.aService.actions.length - 1];
                    if (lastAction.seq) {
                        pos = lastAction.seq - 1 - (this.maxRows * (diff - 1));
                    }
                }
            }

            if (this.paginator.getPage() < this.lastPage) {
                const diff = this.lastPage - this.paginator.getPage();
                this.lastPage = this.paginator.getPage();
                if (this.aService.actions.length > 0) {
                    const firstAction = this.aService.actions[0];
                    if (firstAction.seq) {
                        pos = firstAction.seq + this.maxRows + (this.maxRows * (diff - 1));
                    }
                }
            }

            this.loading = true;
            await this.aService.getActions(
                account,
                pos,
                this.maxRows,
                _skip,
                this.actionMarked,
                this.dateAfter,
                this.dateBefore,
            );
            this.loading = false;
            this.paginator.changePage(e);
        }
    }

    memoCreatorAccName(info) {
        const creator = JSON.stringify(JSON.parse(info)['creator']).replace(new RegExp('\"', 'g'), '');
        return creator === this.aService.selected.getValue().name ? 'this account' : creator;
    }

    updateBalances() {
        const sel = this.aService.selected.getValue();
        this.fullBalance = sel.full_balance;
        this.staked = sel.staked;
        this.unstaked = sel.full_balance - sel.staked - sel.unstaking;
    }

    async refresh() {
        console.log('refresh action history');
        this.actionMarked = '';
        this.dateBefore = '';
        this.dateAfter = '';
        this.minDate = new Date();
        this.maxDate = new Date();
        await this.aService.reloadActions(this.aService.selected.getValue().name);

        this.shouldLazyLoad = false;
        this.paginator.changePage(0);
        setTimeout(() => {
            this.shouldLazyLoad = true;
        }, 200);

    }

}

import { ModuleWithProviders } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { OverviewComponent } from './overview/overview.component';
import { SettingsComponent } from './settings/settings.component';
import { ReceiveComponent, SendComponent, HistoryComponent, AddressBookComponent } from './wallet/wallet.module';
import { MainViewComponent } from 'app/wallet/main/main-view.component';

//   { path: '', redirectTo: '/wallet/overview', pathMatch: 'full' },
const routes: Routes = [
  {
    path: 'main',
    component: MainViewComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: OverviewComponent, data: { title: 'Overview' } },
      { path: 'receive', component: ReceiveComponent, data: { title: 'Receive' } },
      { path: 'send', component: SendComponent, data: { title: 'Send' } },
      { path: 'history', component: HistoryComponent, data: { title: 'History' } },
      { path: 'address-book', component: AddressBookComponent, data: { title: 'Address Book' } }
    ]
  }
];

export const routing: ModuleWithProviders = RouterModule.forChild(routes);

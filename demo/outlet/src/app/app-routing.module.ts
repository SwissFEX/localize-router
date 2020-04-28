import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LocalizeRouterSettings } from '../../../../src/localize-router.config';
import { LocalizeRouterModule } from '../../../../src/localize-router.module';
import { LocalizeParser, ManualParserLoader } from '../../../../src/localize-router.parser';
import { HomeComponent } from './home/home.component';
import { MembersComponent } from './members/members.component';
import { TranslateService } from '@ngx-translate/core';
import { Location } from '@angular/common';

export function ManualLoaderFactory(translate: TranslateService, location: Location, settings: LocalizeRouterSettings) {
  return new ManualParserLoader(translate, location, settings, ['en', 'de']);
}

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
    {
        path: 'members',
        component: MembersComponent,
        loadChildren: './members/members.module#MembersModule'
    }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes),
    LocalizeRouterModule.forRoot(routes, {
      parser: {
        provide: LocalizeParser,
        useFactory: ManualLoaderFactory,
        deps: [TranslateService, Location, LocalizeRouterSettings]
      },
      alwaysSetPrefix: false,
      useCachedLang: false
    })
  ],
  exports: [ RouterModule, LocalizeRouterModule ]
})
export class RoutingModule { }

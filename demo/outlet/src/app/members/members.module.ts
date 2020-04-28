import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LocalizeRouterModule } from '../../../../../src/localize-router.module';
import { BioComponent } from './bio/bio.component';
import { MembersListComponent } from './members-list/members-list.component';

const routes = [
    { path: 'membersList', component: MembersListComponent, outlet: 'list' },
    { path: ':id', component: BioComponent, outlet: 'bio' }
]

@NgModule({
    declarations: [
        MembersListComponent,
        BioComponent
    ],
    imports: [
        RouterModule.forChild(routes),
        LocalizeRouterModule.forChild(routes)
    ]
})
export class MembersModule {}

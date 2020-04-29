import {
    NgModule, ModuleWithProviders, APP_INITIALIZER, Optional, SkipSelf,
    Injectable, Injector, NgModuleFactoryLoader, Inject
} from '@angular/core';
import { LocalizeRouterService } from './localize-router.service';
import { DummyLocalizeParser, LocalizeParser } from './localize-router.parser';
import { RouterModule, Routes } from '@angular/router';
import { LocalizeRouterPipe } from './localize-router.pipe';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import {
    ALWAYS_SET_PREFIX,
    CACHE_MECHANISM,
    CACHE_NAME,
    DEFAULT_LANG_FUNCTION,
    LOCALIZE_ROUTER_FORROOT_GUARD,
    LocalizeRouterConfig,
    LocalizeRouterSettings, RAW_CHILD_ROUTES,
    RAW_ROUTES,
    USE_CACHED_LANG
} from './localize-router.config';
import { LocalizeRouterConfigLoader } from './localize-router-config-loader';

@Injectable()
export class ParserInitializer {
    parser: LocalizeParser;
    routes: Routes;

    /**
     * CTOR
     * @param injector
     */
    constructor(private injector: Injector) {
    }

    /**
     * @returns {Promise<any>}
     */
    appInitializer(): Promise<any> {
        const res = this.parser.load(this.routes);
        res.then(() => {
            const localize: LocalizeRouterService = this.injector.get(LocalizeRouterService);
            localize.init();
        });

        return res;
    }

    /**
     * @param parser
     * @param routes
     * @returns {()=>Promise<any>}
     */
    generateInitializer(parser: LocalizeParser, routes: Routes[]): () => Promise<any> {
        this.parser = parser;
        this.routes = routes.reduce((a, b) => a.concat(b));
        return this.appInitializer;
    }
}

@Injectable()
export class ParserUpdater {
    routes: Routes;

    constructor(private injector: Injector,
                private parser: LocalizeParser) {}

    appUpdater(): Promise<any> {
        const res = this.parser.load(this.routes);
        res.then(() => {
            const localize: LocalizeRouterService = this.injector.get(LocalizeRouterService);
            localize.init();
        });

        return res;
    }

    generateUpdater(routes: Routes): () => Promise<any> {
        if (!this.parser.routes) {
            this.parser.routes = routes;
        } else {
            this.routes = [...this.parser.routes, ...routes];
        }
        return this.appUpdater;
    }
}

/**
 * @param p
 * @param parser
 * @param routes
 * @returns {any}
 */
export function getAppInitializer(p: ParserInitializer, parser: LocalizeParser, routes: Routes[]): any {
    return p.generateInitializer(parser, routes).bind(p);
}

export function getAppUpdater(p: ParserUpdater, routes: Routes) {
    return p.generateUpdater(routes).bind(p);
}

@NgModule({
    imports: [CommonModule, RouterModule, TranslateModule],
    declarations: [LocalizeRouterPipe],
    exports: [LocalizeRouterPipe]
})
export class LocalizeRouterModule {

    constructor(@Inject(RAW_CHILD_ROUTES) routes: Routes,
                @Inject(ParserUpdater) parserUpdater: ParserUpdater) {
        if (routes && routes.length) {
            getAppUpdater(parserUpdater, routes);
        }
    }

    static forRoot(routes: Routes, config: LocalizeRouterConfig = {}): ModuleWithProviders {
        return {
            ngModule: LocalizeRouterModule,
            providers: [
                {
                    provide: LOCALIZE_ROUTER_FORROOT_GUARD,
                    useFactory: provideForRootGuard,
                    deps: [[LocalizeRouterModule, new Optional(), new SkipSelf()]]
                },
                { provide: USE_CACHED_LANG, useValue: config.useCachedLang },
                { provide: ALWAYS_SET_PREFIX, useValue: config.alwaysSetPrefix },
                { provide: CACHE_NAME, useValue: config.cacheName },
                { provide: CACHE_MECHANISM, useValue: config.cacheMechanism },
                { provide: DEFAULT_LANG_FUNCTION, useValue: config.defaultLangFunction },
                LocalizeRouterSettings,
                config.parser || { provide: LocalizeParser, useClass: DummyLocalizeParser },
                {
                    provide: RAW_ROUTES,
                    multi: true,
                    useValue: routes
                },
                LocalizeRouterService,
                ParserInitializer,
                { provide: NgModuleFactoryLoader, useClass: LocalizeRouterConfigLoader },
                {
                    provide: APP_INITIALIZER,
                    multi: true,
                    useFactory: getAppInitializer,
                    deps: [ParserInitializer, LocalizeParser, RAW_ROUTES]
                }
            ]
        };
    }

    static forChild(routes: Routes): ModuleWithProviders {
        return {
            ngModule: LocalizeRouterModule,
            providers: [
                ParserUpdater,
                {
                    provide: RAW_CHILD_ROUTES,
                    multi: true,
                    useValue: routes
                }
            ]
        };
    }
}

/**
 * @param localizeRouterModule
 * @returns {string}
 */
export function provideForRootGuard(localizeRouterModule: LocalizeRouterModule): string {
    if (localizeRouterModule) {
        throw new Error(
            `LocalizeRouterModule.forRoot() called twice. Lazy loaded modules should use LocalizeRouterModule.forChild() instead.`);
    }
    return 'guarded';
}

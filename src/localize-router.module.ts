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
    LocalizeRouterSettings, PATH_TO_CHILD_ROUTE, RAW_CHILD_ROUTES,
    RAW_ROUTES,
    USE_CACHED_LANG
} from './localize-router.config';
import { LocalizeRouterConfigLoader } from './localize-router-config-loader';
import { flatten, unflatten } from 'flat';

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
    parser: LocalizeParser;

    constructor(private injector: Injector) {}

    appUpdater(): Promise<any> {
        const res = this.parser.load(this.routes);
        res.then(() => {
            const localize: LocalizeRouterService = this.injector.get(LocalizeRouterService);
            localize.init();
        });

        return res;
    }

    generateUpdater(parser: LocalizeParser, routes: Routes[], path: string): () => Promise<any> {
        this.parser = parser;
        if (!this.parser.routes) {
            this.routes = routes.reduce((a, b) => a.concat(b));
        } else {
            const parentPath = path.split('.').slice(0, -1).toString();
            this.parser.routes.map(currentRoutes => {
                const flattenedRoutes = flatten(currentRoutes as Array<any>) as any;
                if (Object.keys(flattenedRoutes).indexOf(parentPath) > -1) {
                    flattenedRoutes[`${parentPath}.children`] = routes;
                }
                currentRoutes = unflatten(flattenedRoutes);
            });
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

export function getAppUpdater(p: ParserUpdater, parser: LocalizeParser, routes: Routes[], path: string) {
    return p.generateUpdater(parser, routes, path).bind(p);
}

@NgModule({
    imports: [CommonModule, RouterModule, TranslateModule],
    declarations: [LocalizeRouterPipe],
    exports: [LocalizeRouterPipe]
})
export class LocalizeRouterModule {

    constructor(@Optional() @Inject(RAW_CHILD_ROUTES) routes: Routes[],
                @Optional() @Inject(PATH_TO_CHILD_ROUTE) path: string,
                @Inject(LocalizeParser) parser: LocalizeParser,
                @Inject(ParserUpdater) parserUpdater: ParserUpdater) {
        if (routes && routes.length && path) {
            getAppUpdater(parserUpdater, parser, routes, path);
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
                ParserUpdater,
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

    static forChild(routes: Routes, path: string): ModuleWithProviders {
        return {
            ngModule: LocalizeRouterModule,
            providers: [
                {
                    provide: RAW_CHILD_ROUTES,
                    multi: true,
                    useValue: routes,
                    deps: [ParserUpdater, LocalizeParser, RAW_CHILD_ROUTES]
                },
                {
                    provide: PATH_TO_CHILD_ROUTE,
                    multi: true,
                    useValue: path
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

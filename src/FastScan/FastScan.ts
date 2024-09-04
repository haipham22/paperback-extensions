import {
    ContentRating,
    HomeSection,
    SourceInfo,
    SourceIntents
} from '@paperback/types'
import {
    HomePageType,
    HomeSectionType,
    HTTP_METHOD,
    ScrappyRequestInterceptor
} from '../DefaultScrappy'
import {CheerioAPI} from 'cheerio'
import {constructHeaders} from '../util'
import {Request} from '@paperback/types/src/generated/Exports/Request'

const siteUrl = 'https://fastscans.net/' as string

// noinspection JSUnusedGlobalSymbols
export const FastScanInfo: SourceInfo = {
    name: 'NetTruyen',
    author: 'haipham22',
    contentRating: ContentRating.MATURE,
    icon: 'icon.png',
    version: '1.0.0',
    description: 'FastScan Tracker',
    websiteBaseURL: siteUrl,
    intents:
        SourceIntents.HOMEPAGE_SECTIONS |
        SourceIntents.SETTINGS_UI |
        SourceIntents.CLOUDFLARE_BYPASS_REQUIRED,
}

export class {

    private readonly siteUrl: string

    constructor(public cheerio: CheerioAPI) {
        this.siteUrl = siteUrl
    }


    stateManager = App.createSourceStateManager()

    requestManager = App.createRequestManager({
        requestsPerSecond: 5,
        requestTimeout: 10000,
        interceptor: new ScrappyRequestInterceptor(siteUrl)
    })



    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const request = App.createRequest({
            url: this.siteUrl,
            method: HTTP_METHOD.GET,
        })

        const {data: $doc } = await this.requestManager.schedule(request, 3)

        console.log($doc)


        sectionCallback(
            App.createHomeSection({
                id: HomePageType.FEATURED,
                type: HomeSectionType.singleRowNormal,
                title: 'Truyện đề cử',
                containsMoreItems: false,
                items: [
                    App.createPartialSourceManga({
                        image: 'http://google.com', mangaId: '1', title: '32132'
                    })
                ],
            })
        )
    }

    async getCloudflareBypassRequestAsync(): Promise<Request> {
        return App.createRequest({
            url: this.siteUrl,
            method: HTTP_METHOD.GET,
            headers: constructHeaders(this.siteUrl, {})
        })
    }

}

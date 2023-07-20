import { DefaultParser } from '../DefaultParser'
import { CheerioAPI } from 'cheerio'
import { PartialSourceManga } from '@paperback/types/src/generated/Exports/PartialSourceManga'
import { MangaInfo } from '@paperback/types/src/generated/_exports'
import { Chapter } from '@paperback/types'

export class BlogTruyenParser extends DefaultParser {
    constructor(_cherrio: CheerioAPI, private siteUrl: string) {
        super(_cherrio)
    }

    parserListManga($doc: CheerioAPI, contextBlockSelector?: string): PartialSourceManga[] {
        switch (contextBlockSelector) {
            case '.list-mainpage':
                return $doc('.storyitem', contextBlockSelector)
                    .map((_, $el) => {
                        return {
                            title: $doc('h3 a',$el).attr('title')?.trim(),
                            image: this.parserImg($doc, $el),
                            mangaId: this.siteUrl + $doc('h3 a',$el).attr('href')?.trim(),
                        } as PartialSourceManga
                    })
                    .toArray()
            case '#top-newest-story':
                return $doc('a',contextBlockSelector)
                    .map((_, $el) => {
                        return {
                            title: $doc($el).attr('title')?.trim(),
                            image: this.parserImg($doc, $el),
                            mangaId: this.siteUrl + $doc($el).attr('href')?.trim(),
                        } as PartialSourceManga
                    })
                    .toArray()
            default:
                return []
        }
    }

    parserMangaInfo($: CheerioAPI): MangaInfo {
        return {
            author: $('.description p:contains(\'Tác giả\') > p').text(),
            artist: $('.description p:contains(\'Tác giả\') > p').text(),
            desc: $('.detail-content p').text(),
            titles: [$('.center-side h1.title-detail').text()],
            image: this.parserImg($, $('.col-image')),
            status: $('.status > p + p').text(),
            hentai: false,
        } as MangaInfo
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    parseChapterList($doc: CheerioAPI): Chapter[] {
        return $doc('.list-chapter li.row:not(.heading)')
            .map((_, $el) => {
                const index = Number($doc('a', $el)?.data('id'))
                const [, chapNum] = ($doc('a', $el)?.text() || '').split(' ')
                return {
                    id: $doc('a', $el).attr('href'),
                    chapNum: Number(chapNum),
                    name: $doc('a', $el)?.text(),
                    time: this.convertTime($doc('.col-xs-4', $el).text(), 'hh:mm DD/MM'),
                    sortingIndex: index,
                } as Chapter
            })
            .toArray()
    }

    parseChapterDetails($doc: CheerioAPI): string[] {
        return $doc('.page-chapter', '.reading-detail')
            .map((_, obj): string => {
                return 'https:' + $doc('img', obj).data('original')
            })
            .toArray()
            .filter(Boolean)
    }

    isLastPage($doc: CheerioAPI): boolean {
        const $root = $doc('.pagination-outter')
        const currentPage = $doc('li.active', $root)?.text()
        const nextPage = $doc('li.active + li')?.text()

        return currentPage === (nextPage || '')
    }
}

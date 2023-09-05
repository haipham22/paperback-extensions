import { CheerioAPI } from 'cheerio'
import { PartialSourceManga } from '@paperback/types/src/generated/Exports/PartialSourceManga'
import { Chapter } from '@paperback/types'
import { MangaInfo } from '@paperback/types/src/generated/_exports'
import moment from 'moment'

export abstract class DefaultParser {
    protected constructor(protected _cherrio: CheerioAPI) {}

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    abstract parserListManga(
        $doc: CheerioAPI,
        contextBlockSelector?: string
    ): PartialSourceManga[];

    parserImg($doc: unknown, $el?: unknown, useHttps = true): string {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        let el = $doc('img')

        if ($el) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            el = $doc('img', $el)
        }

        const link = (el.data('src') || el.data('original') || el.attr('src'))?.trim()

        if (link === '') return 'https://i.imgur.com/GYUxEX8.png'

        if (link?.indexOf('https') === -1 && useHttps) {
            return 'https:' + link
        }
        if (link?.indexOf('http') === -1) {
            return 'http:' + link
        }
        return link
    }

    abstract parserMangaInfo($: CheerioAPI): MangaInfo;

    // time format 14:33 15/06
    convertTime(timeAgo: string, format = 'hh:mm DD/MM'): Date {
        let time: Date
        try {
            let trimmed = Number((/\d*/.exec(timeAgo) ?? [])[0])
            trimmed = trimmed == 0 && timeAgo.includes('a') ? 1 : trimmed
            if (timeAgo.includes('giây') || timeAgo.includes('secs')) {
                time = new Date(Date.now() - trimmed * 1000) // => mili giây (1000 ms = 1s)
            } else if (timeAgo.includes('phút')) {
                time = new Date(Date.now() - trimmed * 60000)
            } else if (timeAgo.includes('giờ')) {
                time = new Date(Date.now() - trimmed * 3600000)
            } else if (timeAgo.includes('ngày')) {
                time = new Date(Date.now() - trimmed * 86400000)
            } else if (timeAgo.includes('năm')) {
                time = new Date(Date.now() - trimmed * 31556952000)
            } else {
                const timeFormat = ['DD/MM/YYYY']
                timeFormat.push(format)
                for (const tFormat of timeFormat) {
                    if (moment(timeAgo, tFormat).isValid()) {
                        time = moment(timeAgo, tFormat).toDate()
                        break
                    }
                }
            }
        } catch (err) {
            time = new Date()
        }
        // @ts-ignore
        return time
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    abstract parseChapterList($doc: CheerioAPI): Chapter[];

    abstract parseChapterDetails($doc: CheerioAPI): string[];

    abstract isLastPage($doc: CheerioAPI): boolean;
}

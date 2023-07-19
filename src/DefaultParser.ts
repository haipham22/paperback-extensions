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

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    abstract parserImg($doc: unknown, $el?: unknown): string;

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    parseRating(_$doc: unknown) {
        return 10
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
                time = moment(timeAgo, format).toDate()
            }
        } catch (err) {
            time = new Date()
        }
        return time
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    abstract parseChapterList($doc: CheerioAPI): Chapter[];

    abstract parseChapterDetails($doc: CheerioAPI): string[];

    abstract isLastPage($doc: CheerioAPI): boolean;
}

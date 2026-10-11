import {createPdfHandler} from '../../server/api.mjs';
import {quoteStore} from '../../server/storage.mjs';
import {generateDesignPack} from '../../server/pdf.mjs';
export default createPdfHandler({storeFactory:quoteStore,generatePdf:generateDesignPack});
export const config={path:'/api/design-pack',rateLimit:{action:'rate_limit',aggregateBy:['domain','ip'],windowSize:60,windowLimit:30}};

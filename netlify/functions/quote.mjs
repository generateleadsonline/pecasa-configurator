import {createQuoteHandler} from '../../server/api.mjs';
import {quoteStore} from '../../server/storage.mjs';
export default createQuoteHandler({storeFactory:quoteStore});
export const config={path:'/api/quote',rateLimit:{action:'rate_limit',aggregateBy:['domain','ip'],windowSize:60,windowLimit:20}};

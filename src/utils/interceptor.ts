import { axios } from '../../deps.ts'

export function registerInterceptors() {
	/**
	 * Log all axios error responses, since axios errors objects are not logged
     * by Deno
	 */
	axios.interceptors.response.use(
		(response) => response,
		(error) => {
            if (error.response) {
                console.log('Axios error response config:', error.response.config)
                console.log('Axios error response data:', error.response.status, error.response.data)
            }

            /**
             * For some reason if I make this function async and return a value from here 
             * (thus telling axios there's no error), axios emits an unhandled-rejection
             * event which crashes the application, despite the axios() request being
             * in a blanket try-catch.
             * 
             * I do not know why this happens (since handling auth-related request errors 
             * should be possible in axios response interceptors, and you would typically
             * do a promise.resolve there as well). We do return successfully resolving promises
             * in those cases, and they've worked before in our main app.
             * 
             * Worse, these crashes happen randomly, which suggests a race condition in the
             * Deno runtime. Not all race conditions are errors, though.
             * 
             * Even worse, this same thing works fine in Node.js. Deno is acting up.
             * 
             * But using a Promise.reject() here works fine and I don't have more time
             * to waste on this shit. Stupid ass axios. Or me.
             */
            return Promise.reject(error)
		}
	);
}

registerInterceptors()
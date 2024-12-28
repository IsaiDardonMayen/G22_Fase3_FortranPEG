
// Auto-generated

/** @typedef {import('./Node.js').default} Node*/

/** @template T */
export default class Visitor {
    
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitProducciones(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitOpciones(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitUnion(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitExpresion(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitString(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitClase(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitliteralRango(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitrango(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitCorchetes(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitidRel(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitAny(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitfinCadena(node){
            throw new Error('Implement in subclass');
        }
}

import * as CST from '../parser/visitor/CST.js';
import * as Template from '../Templates.js'
import { getActionId, getReturnType, getExprId, getRuleId } from './utilidades.js';
/**
 * @typedef {import('../parser/visitor/Visitor.js').default<string>} Visitor
 */
/** @typedef {import('../parser/visitor/Visitor.js').ActionTypes} ActionTypes*/   
/**
 * @implements {Visitor}
 */
export default class FortranTranslator {
     /** @type {ActionTypes} */
     actionReturnTypes;
     /** @type {string[]} */
     actions;
     /** @type {boolean} */
     translatingStart;
     /** @type {string} */
     currentRule;
     /** @type {number} */
     currentChoice;
     /** @type {number} */
     currentExpr;
     
    /**
     *
     * @param {ActionTypes} returnTypes
     */

    constructor(returnTypes) {
        this.actionReturnTypes = returnTypes;
        this.actions = [];
        this.translatingStart = false;
        this.currentRule = '';
        this.currentChoice = 0;
        this.currentExpr = 0;
    }

    /**
     * @param {CST.Grammar} node
     * @this {Visitor}
     */
    visitGrammar(node) {
        const rules = node.rules.map((rule) => rule.accept(this));

        return Template.main({
            beforeContains: node.globalCode?.before ?? '',
            afterContains: node.globalCode?.after ?? '',
            startingRuleId: getRuleId(node.rules[0].id),
            startingRuleType: getReturnType(
                getActionId(node.rules[0].id, 0),
                this.actionReturnTypes
            ),
            actions: this.actions,
            rules,
        });
    }

    /**
     * @param {CST.Regla} node
     * @this {Visitor}
     */
    visitRegla(node) {
       
        this.currentRule = node.id;
        this.currentChoice = 0;

        if (node.start) this.translatingStart = true;

        const ruleTranslation = Template.rule({
            id: node.id,
            returnType: getReturnType(
                getActionId(node.id, this.currentChoice),
                this.actionReturnTypes
            ),
            exprDeclarations: node.expr.exprs.flatMap((election, i) =>
                election.exprs
                    .filter((expr) => expr instanceof CST.Pluck)
                    .map((label, j) => {
                        const expr = label.labeledExpr.annotatedExpr.expr;
                        return `${
                            expr instanceof CST.Identificador
                                ? getReturnType(
                                      getActionId(expr.id, i),
                                      this.actionReturnTypes
                                  )
                                : 'character(len=:), allocatable'
                        } :: expr_${i}_${j}`;
                    })
            ),
            expr: node.expr.accept(this),
        });

        this.translatingStart = false;

        return ruleTranslation;
    }
/**
     * @param {CST.Parentesis} node
     * @this {Visitor}
     */

    visitParentesis(node) {
        this.currentChoice = 0;

        if (node.start) this.translatingStart = true;
    

        const parentesisTranslation = Template.parentesis({
            exprDeclarations: node.expr.exprs.flatMap((election, i) =>
                election.exprs
                    .filter((expr) => expr instanceof CST.Pluck)
                    .map((label, j) => {
                        const expr = label.labeledExpr.annotatedExpr.expr;
                        return `${
                            expr instanceof CST.Identificador
                                ? getReturnType(
                                      getActionId(expr.id, i),
                                      this.actionReturnTypes
                                  )
                                : 'character(len=:), allocatable'
                        } :: expr_${i}_${j}`;
                    })
            ),
            expr: node.expr.accept(this),
        });

        this.translatingStart = false;

        console.log(parentesisTranslation);
        return parentesisTranslation;

        
    }
    /**
     * @param {CST.Opciones} node
     * @this {Visitor}
     */
    visitOpciones(node) {
        return Template.election({
            exprs: node.exprs.map((expr) => {
                const translation = expr.accept(this);
                this.currentChoice++;
                return translation;
            }),
        });
    }

    /**
     * @param {CST.Union} node
     * @this {Visitor}
     */
    visitUnion(node) {
        const matchExprs = node.exprs.filter(
            (expr) => expr instanceof CST.Pluck
        );
        const exprVars = matchExprs.map(
            (_, i) => `expr_${this.currentChoice}_${i}`
        );

        /** @type {string[]} */
        let neededExprs;
        /** @type {string} */
        let resultExpr;
        const currFnId = getActionId(this.currentRule, this.currentChoice);
        if (currFnId in this.actionReturnTypes) {
            neededExprs = exprVars.filter(
                (_, i) => matchExprs[i].labeledExpr.label
            );
            resultExpr = Template.fnResultExpr({
                fnId: getActionId(this.currentRule, this.currentChoice),
                exprs: neededExprs.length > 0 ? neededExprs : [],
            });
        } else {
            neededExprs = exprVars.filter((_, i) => matchExprs[i].pluck);
            resultExpr = Template.strResultExpr({
                exprs: neededExprs.length > 0 ? neededExprs : exprVars,
            });
        }
        this.currentExpr = 0;

        if (node.action) this.actions.push(node.action.accept(this));
        return Template.union({
            exprs: node.exprs.map((expr) => {
                const translation = expr.accept(this);
                if (expr instanceof CST.Pluck) this.currentExpr++;
                return translation;
            }),
            startingRule: this.translatingStart,
            resultExpr,
        });
    }

    /**
     * @param {CST.Pluck} node
     * @this {Visitor}
     */
    visitPluck(node) {
        return node.labeledExpr.accept(this);
    }

    /**
     * @param {CST.Label} node
     * @this {Visitor}
     */
    visitLabel(node) {
        return node.annotatedExpr.accept(this);
    }

    /**
     * @param {CST.Annotated} node
     * @this {Visitor}
     */
    visitAnnotated(node) {
        if (node.qty && typeof node.qty === 'string') {
            // Manejo de cuantificadores (?, *, +)
            if (node.expr instanceof CST.Identificador) {
                return `${getExprId(
                    this.currentChoice,
                    this.currentExpr
                )} = ${node.expr.accept(this)}`;
            }
            return Template.strExpr({
                quantifier: node.qty,
                expr: node.expr.accept(this),
                destination: getExprId(this.currentChoice, this.currentExpr),
            });
        } else if (node.qty) {
            const destination = getExprId(this.currentChoice, this.currentExpr);
            const expr = node.expr.accept(this);
            console.log("Entrando a visitAnnotated");
            console.log(node.qty);
            
            if (typeof node.qty === 'number') {
                console.log("Entrando a node.qty === 'number'");
                return Template.fixedRepetition({
                    times: node.qty,
                    expr: expr,
                    destination: destination
                });
            }
            // Repetición con rango |min..max|
            else if (Array.isArray(node.qty) && node.qty.length === 2 && typeof node.qty[0] === 'number' && typeof node.qty[1] === 'number') {
                console.log("Entrando a node.qty === 'Array' con rango");
                return Template.rangeRepetition({
                    min: node.qty[0],
                    max: node.qty[1],
                    expr: expr,
                    destination: destination
                });
            }
            // Repetición con separador |n, 'sep'|
            else if (Array.isArray(node.qty) && node.qty.length === 3 && typeof node.qty[0] === 'number' && typeof node.qty[2] === 'string') {
                console.log("Entrando a node.qty === 'Array' con separador");
                return Template.separatorRepetition({
                    times: node.qty[0],
                    separator: node.qty[2],
                    expr: expr,
                    destination: destination
                });
            }
            // Caso donde qty tiene una estructura más compleja
            else if (Array.isArray(node.qty) && node.qty.length === 5 && node.qty[0] === '|' && Array.isArray(node.qty[1]) && Array.isArray(node.qty[3])) {
                console.log("Entrando a node.qty con estructura compleja");
                // Aquí puedes añadir la lógica específica para manejar este caso.
                return Template.customRepetition({
                    expr: expr,
                    destination: destination,
                    qty: node.qty
                });
            }
        } else {
            if (node.expr instanceof CST.Identificador) {
                return `${getExprId(
                    this.currentChoice,
                    this.currentExpr
                )} = ${node.expr.accept(this)}`;
            }
            return Template.strExpr({
                expr: node.expr.accept(this),
                destination: getExprId(this.currentChoice, this.currentExpr),
            });
        }
    }

    /**
     * @param {CST.Assertion} node
     * @this {Visitor}
     */
    visitAssertion(node) {
        console.log("Entrando a visitAssertion");
        const nodeType = node.assertion instanceof CST.Predicate ? 'Predicate' : 'Annotated';
        return Template.assertion({
            assertionCode: node.assertion.accept(this),
            nodeType: nodeType
        });
    }

    /**
     * @param {CST.NegAssertion} node
     * @this {Visitor}
     */
    visitNegAssertion(node) {
        console.log("Entrando a visitNegAssertion");
        const nodeType = node.assertion instanceof CST.Predicate ? 'Predicate' : 'Annotated';
        return Template.negAssertion({
            assertionCode: node.assertion.accept(this),
            nodeType: nodeType
        });
    }

    /**
     * @param {CST.Predicate} node
     * @this {Visitor}
     */
    visitPredicate(node) {
        return Template.action({
            ruleId: this.currentRule,
            choice: this.currentChoice,
            signature: Object.keys(node.params),
            returnType: node.returnType,
            paramDeclarations: Object.entries(node.params).map(
                ([label, ruleId]) =>
                    `${getReturnType(
                        getActionId(ruleId, this.currentChoice),
                        this.actionReturnTypes
                    )} :: ${label}`
            ),
            code: node.code,
        });
    }

    /**
     * @param {CST.String} node
     * @this {Visitor}
     */
    visitString(node) {
        return `acceptString('${node.val}')`;
    }

    /**
     * @param {CST.Clase} node
     * @this {Visitor}
     */
    visitClase(node) {
        // [abc0-9A-Z]
        let characterClass = [];
        const set = node.chars
            .filter((char) => typeof char === 'string')
            .map((char) => `'${char}'`);
        const ranges = node.chars
            .filter((char) => char instanceof CST.Rango)
            .map((range) => range.accept(this));
        if (set.length !== 0) {
            characterClass = [`acceptSet([${set.join(',')}])`];
        }
        if (ranges.length !== 0) {
            characterClass = [...characterClass, ...ranges];
        }
        return `(${characterClass.join(' .or. ')})`; // acceptSet(['a','b','c']) .or. acceptRange('0','9') .or. acceptRange('A','Z')
    }

    /**
     * @param {CST.Rango} node
     * @this {Visitor}
     */
    visitRango(node) {
        return `acceptRange('${node.bottom}', '${node.top}')`;
    }

    /**
     * @param {CST.Identificador} node
     * @this {Visitor}
     */
    visitIdentificador(node) {
        return getRuleId(node.id) + '()';
    }

    /**
     * @param {CST.Punto} node
     * @this {Visitor}
     */
    visitPunto(node) {
        return 'acceptPeriod()';
    }

    /**
     * @param {CST.Fin} node
     * @this {Visitor}
     */
    visitFin(node) {
        return 'if (.not. acceptEOF()) cycle';
    }

}
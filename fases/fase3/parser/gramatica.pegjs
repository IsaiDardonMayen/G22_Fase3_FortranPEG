{{
    import { ids, usos} from '../index.js'
    import { ErrorReglas } from './error.js';
    import { errores } from '../index.js'
    import * as n from '../parser/visitor/CST.js';
}}

gramatica
  = _ code:globalCode? prods:regla+ _ {
    let duplicados = ids.filter((item, index) => ids.indexOf(item) !== index);
    if (duplicados.length > 0) {
        errores.push(new ErrorReglas("Regla duplicada: " + duplicados[0]));
    }

    // Validar que todos los usos están en ids
    let noEncontrados = usos.filter(item => !ids.includes(item));
    if (noEncontrados.length > 0) {
        errores.push(new ErrorReglas("Regla no encontrada: " + noEncontrados[0]));
    }
    prods[0].start = true;
    return new n.Grammar(prods, code);
  }

globalCode
  = "{" before:$(. !"contains")* [ \t\n\r]* "contains" [ \t\n\r]* after:$[^}]* "}" {
    return after ? {before, after} : {before}
  }

regla
  = _ id:identificador _ alias:(literales)? _ "=" _ expr:opciones (_";")? {
    ids.push(id);
    return new n.Regla(id, expr, alias);
  }

opciones
  = expr:union rest:(_ "/" _ @union)* {
    return new n.Opciones([expr, ...rest]);
  }

union
  = expr:parsingExpression rest:(_ @parsingExpression !(_ literales? _ "=") )* action:(_ @predicate)? {
    const exprs = [expr, ...rest];
    if (action) {
      action.params = action.params || {};
      const getLabeledExpr = (e) => {
        if (e instanceof n.Pluck) return e;
        if (e instanceof n.Parentesis) {
          return e.expr.exprs[0].exprs.find(x => x instanceof n.Pluck);
        }
        return null;
      };
      
      const labeledExprs = exprs
        .map(getLabeledExpr)
        .filter(e => e && e.labeledExpr && e.labeledExpr.label);

      labeledExprs.forEach(labeled => {
        const expr = labeled.labeledExpr.annotatedExpr.expr;
        action.params[labeled.labeledExpr.label] = 
          expr instanceof n.Identificador ? expr.id : '';
      });
    }
    return new n.Union(exprs, action);
  }

parsingExpression
  = '!' NegAssertion:(annotated/predicate) {
 
    return new n.NegAssertion(NegAssertion);
  }
  / pluck
  / '&' assertion:(annotated/predicate) {

    return new n.Assertion(assertion);
  }
  / "!." {
    return new n.Fin();
  }

pluck
  = pluck:"@"? _ expr:label {
    return new n.Pluck(expr, pluck ? true : false);
  }

label
  = label:(@identificador _ ":")? _ expr:annotated {
    return new n.Label(expr, label);
  }

annotated
  = text:"$"? _ expr:match _ qty:([?+*]/conteo)? {
    return new n.Annotated(expr, qty, text ? true : false);
  }
  / text:"!" _ expr:match _ qty:([?+*]/conteo)? {
    return new n.Annotated(expr, qty, text ? true : false);
  }

match
  = id:identificador {
    usos.push(id)
    return new n.Identificador(id);
  }
  / val:$literales isCase:"i"? {
    return new n.String(val.replace(/['"]/g, ''), isCase ? true : false);
  }
  / "(" _ exprs:opciones _ ")" {
    return new n.Parentesis(exprs);
  }
  / chars:clase isCase:"i"? {
    return new n.Clase(chars, isCase ? true : false);
  }
  / "." {
    return new n.Punto();
  }

conteo
  = "|" _ (numero / id:identificador) _ "|"
  / "|" _ (numero / id:identificador)? _ ".." _ (numero / id2:identificador)? _ "|"
  / "|" _ (numero / id:identificador)? _ "," _ opciones _ "|"
  / "|" _ (numero / id:identificador)? _ ".." _ (numero / id2:identificador)? _ "," _ opciones _ "|"

predicate
  = "{" [ \t\n\r]* returnType:predicateReturnType code:$[^}]* "}" {
    return new n.Predicate(returnType, code, {})
  }

predicateReturnType
  = t:$(. !"::")+ [ \t\n\r]* "::" [ \t\n\r]* "res" {
    return t.trim();
  }

clase
  = "[" @contenidoClase+ "]"

contenidoClase
  = bottom:$caracter "-" top:$caracter {
    return new n.Rango(bottom, top);
  }
  / $caracter

caracter
  = [^\[\]\\]
  / "\\" .

literales
  = '"' @stringDobleComilla* '"'
  / "'" @stringSimpleComilla* "'"

stringDobleComilla = !('"' / "\\" / finLinea) .
                    / "\\" escape
                    / continuacionLinea

stringSimpleComilla = !("'" / "\\" / finLinea) .
                    / "\\" escape
                    / continuacionLinea

continuacionLinea = "\\" secuenciaFinLinea

finLinea = [\n\r\u2028\u2029]

escape = "'"
        / '"'
        / "\\"
        / "b"
        / "f"
        / "n"
        / "r"
        / "t"
        / "v"
        / "u"

secuenciaFinLinea = "\r\n" / "\n" / "\r" / "\u2028" / "\u2029"

// literales = 
//     "\"" [^"]* "\""
//     / "'" [^']* "'"
    
numero = [0-9]+

identificador = [_a-z]i[_a-z0-9]i* { return text() }

_ = (Comentarios /[ \t\n\r])*

Comentarios = 
    "//" [^\n]* 
    / "/*" (!"*/" .)* "*/"

/*
 * WisonCompiler_EH - Gramatica Jison para el Lenguaje Wison
 * 
 * Este archivo define la gramatica lexica y sintactica del lenguaje Wison
 * utilizando la sintaxis de Jison. El objetivo es parsear archivos Wison
 * y generar un AST (Abstract Syntax Tree) que contenga:
 * 
 * - Terminales: Conjunto T de simbolos terminales
 * - No Terminales: Conjunto N de simbolos no terminales  
 * - Producciones: Conjunto P de reglas de produccion
 * - Simbolo Inicial: Simbolo S de inicio de la gramatica
 * 
 * Estructura del lenguaje Wison:
 * Wison SIGNO_PREGUNTA_INVERTIDA
 *   Lex {: ... :}      (Bloque de analisis lexico)
 *   Syntax {{: ... :}} (Bloque de analisis sintactico)
 * ?Wison
 */

%lex
%options case-sensitive

%%

\s+                                        /* ignorar espacios, tabs, saltos de linea */
"#"[^\n]*                                  /* comentario de linea - todo despues de # hasta fin de linea */
"/*"([^*]|\*(?!\/))*"*/"                   /* comentario de bloque multilinea */

"Wison"                 return 'WISON_KW';
"Lex"                   return 'LEX_KW';
"Syntax"                return 'SYNTAX_KW';
"Terminal"              return 'TERMINAL_KW';
"No_Terminal"           return 'NO_TERMINAL_KW';
"Initial_Sim"           return 'INITIAL_SIM_KW';

"¿"                     return 'WISON_START';
"?Wison"                return 'WISON_END';
"{{:"                   return 'SYNTAX_START';
":}}"                   return 'SYNTAX_END';
"{:"                    return 'LEX_START';
":}"                    return 'LEX_END';

"<-"                    return 'ASSIGN_LEX';
"<="                    return 'ASSIGN_SYNTAX';
"|"                     return 'OR';
";"                     return 'SEMICOLON';
"("                     return 'LPAREN';
")"                     return 'RPAREN';
"["                     return 'LBRACKET';
"]"                     return 'RBRACKET';

"*"                     return 'KLEENE_STAR';
"+"                     return 'KLEENE_PLUS';
"?"                     return 'OPTIONAL';

"aA-zZ"                 return 'ALPHA_RANGE';
"0-9"                   return 'DIGIT_RANGE';

"$_"[a-zA-Z_][a-zA-Z0-9_]*    return 'TERMINAL_ID';
"%_"[a-zA-Z_][a-zA-Z0-9_]*    return 'NON_TERMINAL_ID';

\'([^'\\]|\\.)*\'        return 'STRING_LITERAL';

[a-zA-Z_][a-zA-Z0-9_]*  return 'IDENTIFIER';

.                       return 'UNKNOWN';

<<EOF>>                 return 'EOF';

/lex

/* ANALISIS SINTACTICO */

%start wison_program

%%

wison_program
  : WISON_KW WISON_START lex_block syntax_block WISON_END EOF
    {
      $$ = {
        type: 'WisonProgram',
        terminals: $3.terminals || [],
        nonTerminals: $4.nonTerminals || [],
        productions: $4.productions || [],
        initialSymbol: $4.initialSymbol || null,
        lexBlock: $3,
        syntaxBlock: $4
      };
      return $$;
    }
  ;

lex_block
  : LEX_KW LEX_START lex_statements LEX_END
    {
      $$ = {
        type: 'LexBlock',
        terminals: $3
      };
    }
  ;

lex_statements
  : lex_statements lex_statement
    {
      $1.push($2);
      $$ = $1;
    }
  | lex_statement
    {
      $$ = [$1];
    }
  |
    {
      $$ = [];
    }
  ;

lex_statement
  : TERMINAL_KW TERMINAL_ID ASSIGN_LEX regex_expression SEMICOLON
    {
      $$ = {
        type: 'TerminalDeclaration',
        name: $2,
        expression: $4
      };
    }
  ;

regex_expression
  : regex_expression OR regex_term
    {
      $$ = {
        type: 'OrExpression',
        left: $1,
        right: $3
      };
    }
  | regex_term
    {
      $$ = $1;
    }
  ;

regex_term
  : regex_factor
    {
      $$ = $1;
    }
  | regex_term regex_factor
    {
      $$ = {
        type: 'ConcatenationExpression',
        left: $1,
        right: $2
      };
    }
  ;

regex_factor
  : regex_atom
    {
      $$ = $1;
    }
  | regex_atom KLEENE_STAR
    {
      $$ = {
        type: 'KleeneStarExpression',
        expression: $1
      };
    }
  | regex_atom KLEENE_PLUS
    {
      $$ = {
        type: 'KleenePlusExpression', 
        expression: $1
      };
    }
  | regex_atom OPTIONAL
    {
      $$ = {
        type: 'OptionalExpression',
        expression: $1
      };
    }
  ;

regex_atom
  : STRING_LITERAL
    {
      $$ = {
        type: 'StringLiteral',
        value: $1
      };
    }
  | LBRACKET ALPHA_RANGE RBRACKET
    {
      $$ = {
        type: 'CharacterRange',
        range: 'aA-zZ'
      };
    }
  | LBRACKET DIGIT_RANGE RBRACKET
    {
      $$ = {
        type: 'CharacterRange', 
        range: '0-9'
      };
    }
  | LPAREN regex_expression RPAREN
    {
      $$ = {
        type: 'GroupExpression',
        expression: $2
      };
    }
  | TERMINAL_ID
    {
      $$ = {
        type: 'TerminalReference',
        name: $1
      };
    }
  ;

syntax_block
  : SYNTAX_KW SYNTAX_START syntax_statements SYNTAX_END
    {
      $$ = {
        type: 'SyntaxBlock',
        nonTerminals: $3.nonTerminals || [],
        initialSymbol: $3.initialSymbol || null,
        productions: $3.productions || []
      };
    }
  ;

syntax_statements
  : syntax_statements syntax_statement
    {
      if ($2.type === 'NonTerminalDeclaration') {
        $1.nonTerminals = $1.nonTerminals || [];
        $1.nonTerminals.push($2);
      } else if ($2.type === 'InitialSymbolDeclaration') {
        $1.initialSymbol = $2.symbol;
      } else if ($2.type === 'ProductionRule') {
        $1.productions = $1.productions || [];
        $1.productions.push($2);
      }
      $$ = $1;
    }
  | syntax_statement
    {
      $$ = {
        nonTerminals: [],
        productions: [],
        initialSymbol: null
      };
      
      if ($1.type === 'NonTerminalDeclaration') {
        $$.nonTerminals.push($1);
      } else if ($1.type === 'InitialSymbolDeclaration') {
        $$.initialSymbol = $1.symbol;
      } else if ($1.type === 'ProductionRule') {
        $$.productions.push($1);
      }
    }
  |
    {
      $$ = {
        nonTerminals: [],
        productions: [],
        initialSymbol: null
      };
    }
  ;

syntax_statement
  : NO_TERMINAL_KW NON_TERMINAL_ID SEMICOLON
    {
      $$ = {
        type: 'NonTerminalDeclaration',
        name: $2
      };
    }
  | INITIAL_SIM_KW NON_TERMINAL_ID SEMICOLON
    {
      $$ = {
        type: 'InitialSymbolDeclaration',
        symbol: $2
      };
    }
  | NON_TERMINAL_ID ASSIGN_SYNTAX production_rules SEMICOLON
    {
      $$ = {
        type: 'ProductionRule',
        leftSide: $1,
        rightSides: $3
      };
    }
  ;

production_rules
  : production_rules OR production_rule
    {
      $1.push($3);
      $$ = $1;
    }
  | production_rule
    {
      $$ = [$1];
    }
  ;

production_rule
  : symbol_sequence
    {
      $$ = {
        type: 'Production',
        symbols: $1
      };
    }
  |
    {
      $$ = {
        type: 'Production',
        symbols: []
      };
    }
  ;

symbol_sequence
  : symbol_sequence symbol
    {
      $1.push($2);
      $$ = $1;
    }
  | symbol
    {
      $$ = [$1];
    }
  ;

symbol
  : NON_TERMINAL_ID
    {
      $$ = {
        type: 'NonTerminalSymbol',
        name: $1
      };
    }
  | TERMINAL_ID
    {
      $$ = {
        type: 'TerminalSymbol',
        name: $1
      };
    }
  ;

%%
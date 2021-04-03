import path from 'path';
import { CustomGenerator } from '../types';

const templatePath = path.resolve(__dirname, '../../init-template/default');
const resolveFile = (file: string): string => {
    return path.resolve(templatePath, file);
};

/**
 * Asks questions to the user used to modify generation
 * @param self Generator values
 * @param Question Contains questions
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function questions(self: CustomGenerator, Question: Record<string, any>): Promise<void> {
    // Handle JS language solutions
    const { langType } = await Question.List(
        self,
        'langType',
        'Which of the following JS solutions do you want to use?',
        ['none', 'ES6', 'Typescript'],
        'none',
        self.force,
    );

    switch (langType) {
        case 'ES6':
            self.dependencies = [...self.dependencies, 'babel-loader', '@babel/core', '@babel/preset-env'];
            break;
        case 'Typescript':
            self.dependencies = [...self.dependencies, 'typescript', 'ts-loader'];
            break;
    }

    // Configure devServer configuraion
    const { devServer } = await Question.Confirm(self, 'devServer', 'Do you want to use webpack-dev-server?', true, self.force);
    if (devServer) {
        self.dependencies = [...self.dependencies, 'webpack-dev-server'];
    }

    // Handle addition of html-webpack-plugin
    const { htmlWebpackPlugin } = await Question.Confirm(
        self,
        'htmlWebpackPlugin',
        'Do you want to simplify the creation of HTML files for your bundle?',
        true,
        self.force,
    );
    if (htmlWebpackPlugin) {
        self.dependencies = [...self.dependencies, 'html-webpack-plugin'];
    }

    // Store all answers for generation
    self.answers = { ...self.answers, langType, devServer, htmlWebpackPlugin };

    // Handle CSS solutions
    const { cssType } = await Question.List(
        self,
        'cssType',
        'Which of the following CSS solutions do you want to use?',
        ['none', 'CSS only', 'SASS', 'LESS', 'Stylus'],
        'none',
        self.force,
    );

    if (cssType == 'none') {
        self.answers = { ...self.answers, cssType, isCSS: false, isPostCSS: false, isExtractPlugin: false };
        return;
    }

    const { isCSS } =
        cssType != 'CSS only'
            ? await Question.Confirm(self, 'isCSS', `Will you be using CSS styles along with ${cssType} in your project?`, true, self.force)
            : { isCSS: true };

    const { isPostCSS } = await Question.Confirm(
        self,
        'isPostCSS',
        'Will you be using PostCSS in your project?',
        cssType == 'CSS only',
        self.force,
    );

    const { isExtractPlugin } = await Question.Confirm(
        self,
        'isExtractPlugin',
        'Do you want to extract CSS for every file?',
        true,
        self.force,
    );

    switch (cssType) {
        case 'SASS':
            self.dependencies = [...self.dependencies, 'sass-loader', 'sass'];
            break;
        case 'LESS':
            self.dependencies = [...self.dependencies, 'less-loader', 'less'];
            break;
        case 'Stylus':
            self.dependencies = [...self.dependencies, 'stylus-loader', 'stylus'];
            break;
    }

    if (isCSS) {
        self.dependencies = [...self.dependencies, 'style-loader', 'css-loader'];
    }

    if (isPostCSS) {
        self.dependencies = [...self.dependencies, 'postcss-loader', 'postcss', 'autoprefixer'];
    }

    if (isExtractPlugin) {
        self.dependencies = [...self.dependencies, 'mini-css-extract-plugin'];
    }

    self.answers = { ...self.answers, cssType, isCSS, isPostCSS, isExtractPlugin };
}

/**
 * Handles generation of project files
 * @param self Generator values
 */
export function generate(self: CustomGenerator): void {
    self.fs.extendJSON(
        self.destinationPath('package.json'),
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require(resolveFile('package.json.js'))(self.answers.devServer),
    );

    // Generate entry file
    let entry = './src/index.';
    if (self.answers.langType == 'Typescript') {
        entry += 'ts';
    } else {
        entry += 'js';
    }
    self.fs.copyTpl(resolveFile('index.js'), self.destinationPath(entry));

    // Generate README
    self.fs.copyTpl(resolveFile('README.md'), self.destinationPath('README.md'), {});

    // Generate HTML file
    self.fs.copyTpl(resolveFile('template.html'), self.destinationPath('index.html'), {});

    // Generate webpack configuration
    self.fs.copyTpl(resolveFile('webpack.configjs.tpl'), self.destinationPath('webpack.config.js'), { ...self.answers, entry });

    // Generate JS language essentials
    switch (self.answers.langType) {
        case 'ES6':
            self.fs.copyTpl(resolveFile('.babelrc'), self.destinationPath('.babelrc'));
            break;
        case 'Typescript':
            self.fs.copyTpl(resolveFile('tsconfig.json'), self.destinationPath('tsconfig.json'));
            break;
    }

    // Generate postcss configuration
    if (self.answers.isPostCSS) {
        self.fs.copyTpl(resolveFile('postcss.config.js'), self.destinationPath('postcss.config.js'));
    }
}
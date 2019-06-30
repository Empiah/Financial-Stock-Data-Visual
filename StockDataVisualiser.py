from datetime import date, timedelta  # this is for manpulating dates

import matplotlib.pyplot as plt  # this is for plotting graphs
import matplotlib.lines as mlines #for creating our own legend
import numpy as np  # this is a useful numerical package
import pandas as pd  # this makes it easy to handle data
import statsmodels.api as sm  # this is for regression
import talib  # this is a package that can perform technical analysis for us
from alpha_vantage.timeseries import TimeSeries #for stock information
from pandas.plotting import \
    register_matplotlib_converters  # registering matplotlib converters
from pytrends.request import \
    TrendReq  # this is a package to get google trends data
        
register_matplotlib_converters() # registering matplotlib converters


#the objective of this is to get stock data to enable us to produce the statistics that we want

#in an excel document we have a list of all acceptable values that can be entered
available_tickers = pd.read_csv('Data/ticker_list.csv')


#the first part of this script will be confirming user inputs
############################################

#cd Dropbox/6.\ Programming/Python/Python\ Projects/StockData/Financial-Stock-Data-Visual/

#first of all we need to get some input from the user as to what stocks they want to see
def get_ticker():
    
    #general overview to the user of what this script will do
    print('This script will take some user input and display various statistics and graphs')
    
    #this will get some user input, it will only take valid inputs
    while True:
        try:
            ticker = str(input('\nPlease enter a stock ticker:\n'))
        #this will return if what is entered is not a string
        except ValueError:
            print('{} was not understood'.format(ticker))
            continue
        #this will return if what is entered is not in the csv above
        if available_tickers.ticker.isin([ticker.upper()]).any() == False:
            print('{} was not in the list of available tickers'.format(ticker))
            continue
        #if these criterias are all met then we can accept the input
        else:
            ticker = ticker.upper()
            break
        #here we will pull the stock name from the sheet as we have been give then ticker
    ticker_confirm = available_tickers.loc[available_tickers['ticker'] == ticker, 'Company']

        #we will present this date to the user to confirm it
    while True:
        start_confirm = str(input('\nPlease confirm the input is correct \nTicker = {}\n[y/n]:\n'.format(ticker_confirm)))
        if start_confirm.lower() == 'y':
            print('Thanks for confirming!\n')
            break
        elif start_confirm.lower() == 'n':
            #if the user selects no, we will close the script
            print('\nOkay lets get that information again - the system will close, please run again to start\n')
            raise SystemExit
        else:
            #we will confirm the output
            print('Sorry that was not a valid input - please try again')
            continue

    return ticker

#the second part of this script will be getting the stock data and calculating the statistics we need
############################################

def get_stock_information(ticker):
    #we need to find a data service that we can use that will allow us to take stock data
    #we will use Alpha Vantagev- we have made an account and our API key and data is below

    api_info = pd.read_csv('~/Dropbox/6. Programming/Python/Python Projects/alphavantageapi.csv')
    api_key = api_info['info'][1]

    ts = TimeSeries(key=api_key, output_format='pandas')
    start_date = date.today() - timedelta(days=(12 * (365/12)))

    data, meta_data = ts.get_daily_adjusted(symbol=ticker, outputsize='full')

    data = data.reset_index()
    data['date'] = pd.to_datetime(data['date'])
    data = data[data['date'] >= start_date]
    data.set_index('date', inplace=True)

    data.rename({'5. adjusted close' : 'adjusted close'}, axis=1, inplace=True)
    stock_data = data[['adjusted close']]

    return stock_data


def get_google_trends_info(ticker):
    #here we will query google to get some google trends data

    #Import - tz is timezone
    pytrends = TrendReq(hl='en-US', tz=0)

    ### import it into the query - for dates use yyy-mm-dd 
    kw_list = [str(ticker)]
    pytrends.build_payload(kw_list, cat=0, timeframe='today 12-m', geo='',gprop='')
    google_trends = pytrends.interest_over_time()


    return google_trends


def tech_indicator_calc(stock_data):
    #the first thing we will work out with our stock data is MACD
    #the formula we will use to calculate the moving average convergence divergence (macd) is as follows
    #(12 Day Exponential Moving Average (EMA) - 26 Day EMA)
    #instead of having to code the whole thing, we can use the talib module and input the below

    macd, macdsignal, macdhist = talib.MACD(stock_data['adjusted close'], fastperiod=12, slowperiod=26, signalperiod=9)

    #we will also calculate the Relative Strength Index (RSI)
    rsi = talib.RSI(stock_data['adjusted close'], timeperiod=14)

    #print(macd, macdhist)

    return macd, macdsignal, macdhist, rsi


def stock_regression(stock_data):

    #here we are simply creating some moving averages, for both 12 and 26 length periods
    stock_data['ema12'] = stock_data['adjusted close'].ewm(com=12).mean()
    stock_data['ema26'] = stock_data['adjusted close'].ewm(com=26).mean()
    
    #here we are looking at adding in points to show when the moverage average crosses
    #the first line will get the difference, and the first will shift it up
    stock_data['ema_diff'] = stock_data['ema26'] - stock_data['ema12']
    stock_data['ema_diff_shift'] = stock_data['ema_diff'].shift(-1)
    
    """
    stock_data['ema_diff_up'] = np.where(stock_data['ema_diff'].between(0.1, -0.1) & (stock_data['ema_diff_shift'] > 0, 1, 0))
    stock_data['ema_diff_down'] = np.where(stock_data['ema_diff'].between(0.1, -0.1) & (stock_data['ema_diff_shift'] < 0, 1, 0)) 
    """

    print(stock_data.head())
    print(stock_data.tail())
    print(stock_data.shape)

    #this will create some regression data so that we can plot it
    #at the moment this is just simple linear regression
    stock_data['regression'] = sm.OLS(stock_data['adjusted close'], sm.add_constant(range(len(stock_data.index)),
                                prepend=True)).fit().fittedvalues


    return stock_data


#the third part of this script will be plotting the data
###########################################

def plot_graphs(stock_data, google_trends, macd, macdsignal, macdhist, rsi, ticker):
    #we can plot some of the data we have made earlier, price and some macd data

    #this will set up the subplot and give it a title
    f, axarr = plt.subplots(4, sharex=True)
    f.suptitle('Stock Price and Technical Indicators')

    #this will configure the first graph - the stock price
    axarr[0].plot(stock_data[['adjusted close', 'ema12', 'ema26']])
    axarr[0].plot(stock_data['regression'], 'g--', linewidth=2, markersize=1)
    axarr[0].legend(stock_data)
    axarr[0].set_title('Stock Price')

    #this will plot the MACD, the line is on 0 to reflect convergence/divergence
    axarr[1].plot(macd)
    axarr[1].plot(macdsignal)
    #axarr[1].plot(macdhist) - we may add this back in, but for the time being lets not
    macd_legend = mlines.Line2D([], [], color='C0', label='macd-12') #have to create a custom legend here
    macdsignal_legend = mlines.Line2D([], [], color='C1', label='macd-26') #have to create a custom legend here
    axarr[1].legend(handles=[macd_legend, macdsignal_legend])
    axarr[1].set_title('MACD')
    axarr[1].axhline(0,color='black',ls='--')

    #this plots RSI, the line on 30 reflects oversold and 70 reflects overbought
    axarr[2].plot(rsi)
    axarr[2].set_title('RSI')
    axarr[2].axhline(30,color='green',ls='--')
    axarr[2].axhline(70,color='red',ls='--')

    #this plots RSI, the line on 30 reflects oversold and 70 reflects overbought
    axarr[3].plot(google_trends[[str(ticker)]])
    axarr[3].set_title('Google Trends')

    plt.show()


def main():
    #this is the main variable where we will run all of the about functions

    ticker = get_ticker()
    google_trends = get_google_trends_info(ticker)
    stock_data = get_stock_information(ticker)
    macd, macdsignal, macdhist, rsi = tech_indicator_calc(stock_data)
    stock_data = stock_regression(stock_data)
    plot_graphs(stock_data, google_trends, macd, macdsignal, macdhist, rsi, ticker)

    while True:
        replay = str(input('\nDo you want to run this script again? [y/n]:\n'))
        if replay.lower() == 'y':
            ticker = get_ticker()
            google_trends = get_google_trends_info(ticker)
            stock_data = get_stock_information(ticker)
            macd, macdsignal, macdhist, rsi = tech_indicator_calc(stock_data)
            stock_data = stock_regression(stock_data)
            plot_graphs(stock_data, google_trends, macd, macdsignal, macdhist, rsi, ticker)
            continue
        elif replay.lower() == 'n':
            print('Okay thanks for confirming!')
            raise SystemExit
        else:
            print('That was not a valid input - please try another')
            continue


if __name__ == "__main__":
    main()



#TODO 
#improve regression
#add some fundemental indicators?
#replace SystemExits
#replace datetime.date with new
#get stock list from new source
#pytrends - testing diff functionality
#app
#points that register macd movement - spit out to csv to look
